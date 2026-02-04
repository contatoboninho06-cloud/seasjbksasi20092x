import { useEffect } from 'react';

const UTM_STORAGE_KEY = 'utm_tracking_data';

export interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  ttclid?: string;
  captured_at: string;
  landing_page: string;
}

// Captura parametros UTM e Click IDs da URL
export function captureUTMParams(): UTMData | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  const existingData = getUTMData();
  
  const newData: UTMData = {
    utm_source: params.get('utm_source') || existingData?.utm_source,
    utm_medium: params.get('utm_medium') || existingData?.utm_medium,
    utm_campaign: params.get('utm_campaign') || existingData?.utm_campaign,
    utm_content: params.get('utm_content') || existingData?.utm_content,
    utm_term: params.get('utm_term') || existingData?.utm_term,
    gclid: params.get('gclid') || existingData?.gclid,
    fbclid: params.get('fbclid') || existingData?.fbclid,
    ttclid: params.get('ttclid') || existingData?.ttclid,
    captured_at: existingData?.captured_at || new Date().toISOString(),
    landing_page: existingData?.landing_page || window.location.pathname,
  };
  
  // So salva se tiver algum dado relevante
  const hasData = Object.entries(newData).some(([key, value]) => 
    key !== 'captured_at' && key !== 'landing_page' && value
  );
  
  if (hasData) {
    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.warn('Failed to save UTM data:', e);
    }
  }
  
  return hasData ? newData : null;
}

// Recupera dados UTM salvos
export function getUTMData(): UTMData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('Failed to get UTM data:', e);
    return null;
  }
}

// Limpa dados UTM (opcional, apos compra)
export function clearUTMData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(UTM_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear UTM data:', e);
  }
}

// Hook React para usar no App
export function useUTMTracking() {
  useEffect(() => {
    captureUTMParams();
  }, []);
  
  return { getUTMData, clearUTMData };
}
