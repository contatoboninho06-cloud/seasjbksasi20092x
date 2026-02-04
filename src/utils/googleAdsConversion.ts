// Declaracoes de tipo globais
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    gtagReady: boolean;
    initGtag: (conversionId: string) => void;
  }
}

export interface EnhancedConversionData {
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  street?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

export interface ConversionResult {
  success: boolean;
  method: 'gtag' | 'datalayer' | 'failed';
  timestamp: string;
  details?: string;
}

// Aguarda gtag estar disponivel (max 15 segundos)
export async function waitForGtag(): Promise<boolean> {
  const maxWait = 15000;
  const interval = 200;
  let waited = 0;

  return new Promise((resolve) => {
    const check = () => {
      if (typeof window !== 'undefined' && 
          typeof window.gtag === 'function' && 
          Array.isArray(window.dataLayer)) {
        resolve(true);
        return;
      }
      
      waited += interval;
      if (waited >= maxWait) {
        resolve(false);
        return;
      }
      
      setTimeout(check, interval);
    };
    
    check();
  });
}

// Hash SHA-256 para Enhanced Conversions
async function sha256Hash(str: string): Promise<string> {
  if (!str) return '';
  const normalized = str.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Prepara dados de Enhanced Conversion hashados
async function prepareEnhancedData(data: EnhancedConversionData) {
  const enhanced: Record<string, string> = {};
  
  if (data.email) enhanced.sha256_email_address = await sha256Hash(data.email);
  if (data.phone_number) enhanced.sha256_phone_number = await sha256Hash(data.phone_number.replace(/\D/g, ''));
  if (data.first_name) enhanced.sha256_first_name = await sha256Hash(data.first_name);
  if (data.last_name) enhanced.sha256_last_name = await sha256Hash(data.last_name);
  if (data.street) enhanced.address_street = data.street;
  if (data.city) enhanced.address_city = data.city;
  if (data.region) enhanced.address_region = data.region;
  if (data.postal_code) enhanced.address_postal_code = data.postal_code;
  if (data.country) enhanced.address_country = data.country || 'BR';
  
  return enhanced;
}

// Envia conversao do Google Ads
export async function sendGoogleAdsConversion(
  conversionLabel: string,
  value: number,
  conversionId: string,
  currency: string = 'BRL',
  transactionId?: string,
  enhancedData?: EnhancedConversionData
): Promise<ConversionResult> {
  // Verifica se esta no browser
  if (typeof window === 'undefined') {
    return { 
      success: false, 
      method: 'failed', 
      timestamp: new Date().toISOString(),
      details: 'Not in browser environment'
    };
  }

  // Inicializa gtag se necessario
  if (conversionId && !window.gtagReady && typeof window.initGtag === 'function') {
    window.initGtag(conversionId);
  }

  // Aguarda gtag
  const gtagAvailable = await waitForGtag();
  
  const conversionData: Record<string, any> = {
    send_to: `${conversionId}/${conversionLabel}`,
    value: value,
    currency: currency,
  };
  
  if (transactionId) {
    conversionData.transaction_id = transactionId;
  }
  
  // Adiciona Enhanced Conversions se disponivel
  if (enhancedData) {
    conversionData.user_data = await prepareEnhancedData(enhancedData);
  }

  // Tenta via gtag
  if (gtagAvailable && typeof window.gtag === 'function') {
    try {
      window.gtag('event', 'conversion', conversionData);
      console.log('[GoogleAds] Conversion sent via gtag:', conversionLabel);
      return {
        success: true,
        method: 'gtag',
        timestamp: new Date().toISOString(),
        details: `Label: ${conversionLabel}, Value: ${value}`
      };
    } catch (error) {
      console.error('[GoogleAds] gtag error:', error);
    }
  }

  // Fallback via dataLayer.push
  if (Array.isArray(window.dataLayer)) {
    try {
      window.dataLayer.push({
        event: 'conversion',
        ...conversionData
      });
      console.log('[GoogleAds] Conversion sent via dataLayer:', conversionLabel);
      return {
        success: true,
        method: 'datalayer',
        timestamp: new Date().toISOString(),
        details: `Label: ${conversionLabel}, Value: ${value} (fallback)`
      };
    } catch (error) {
      console.error('[GoogleAds] dataLayer error:', error);
    }
  }

  return {
    success: false,
    method: 'failed',
    timestamp: new Date().toISOString(),
    details: 'gtag and dataLayer unavailable'
  };
}

// Eventos especificos do checkout
export async function trackBeginCheckout(
  conversionId: string,
  labels: Record<string, string>,
  value: number,
  enhancedData?: EnhancedConversionData
): Promise<ConversionResult | null> {
  const label = labels.begin_checkout;
  if (!label || !conversionId) return null;
  return sendGoogleAdsConversion(label, value, conversionId, 'BRL', undefined, enhancedData);
}

export async function trackAddPaymentInfo(
  conversionId: string,
  labels: Record<string, string>,
  value: number,
  enhancedData?: EnhancedConversionData
): Promise<ConversionResult | null> {
  const label = labels.add_payment_info;
  if (!label || !conversionId) return null;
  return sendGoogleAdsConversion(label, value, conversionId, 'BRL', undefined, enhancedData);
}

export async function trackPurchase(
  conversionId: string,
  labels: Record<string, string>,
  value: number,
  transactionId: string,
  enhancedData?: EnhancedConversionData
): Promise<ConversionResult | null> {
  const label = labels.purchase;
  if (!label || !conversionId) return null;
  return sendGoogleAdsConversion(label, value, conversionId, 'BRL', transactionId, enhancedData);
}
