// Meta Pixel / Facebook Conversion API utilities

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    _fbPixelId?: string;
    initMetaPixel?: (pixelId: string) => void;
  }
}

export interface MetaEventData {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{ id: string; quantity: number }>;
  currency: string;
  value: number;
  num_items?: number;
}

export interface MetaUserData {
  em?: string;      // email
  ph?: string;      // phone
  fn?: string;      // first name
  ln?: string;      // last name
  ct?: string;      // city
  st?: string;      // state
  zp?: string;      // zip code
  country?: string;
  external_id?: string;
}

// SHA-256 hash for Meta CAPI
export async function hashForMeta(value: string): Promise<string> {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Format phone for Meta (E.164 without +)
export function formatPhoneForMeta(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  // Add Brazil country code if not present
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  return cleaned;
}

// Generate unique event ID for deduplication
export function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Send InitiateCheckout event
export function sendMetaInitiateCheckout(
  eventData: MetaEventData,
  userData?: MetaUserData,
  eventId?: string
): void {
  if (typeof window === 'undefined' || !window.fbq) {
    console.log('[Meta Pixel] fbq not available');
    return;
  }

  const id = eventId || generateEventId();
  
  try {
    window.fbq('track', 'InitiateCheckout', {
      content_type: eventData.content_type || 'product',
      content_ids: eventData.content_ids,
      currency: eventData.currency,
      value: eventData.value,
      num_items: eventData.num_items,
    }, { eventID: id });
    
    console.log('[Meta Pixel] InitiateCheckout sent', { eventId: id });
  } catch (error) {
    console.error('[Meta Pixel] Error sending InitiateCheckout:', error);
  }
}

// Send Purchase event
export async function sendMetaPurchase(
  eventData: MetaEventData,
  userData?: MetaUserData,
  eventId?: string
): Promise<void> {
  if (typeof window === 'undefined' || !window.fbq) {
    console.log('[Meta Pixel] fbq not available');
    return;
  }

  const id = eventId || generateEventId();
  
  try {
    // Build user data object with hashed values for advanced matching
    const advancedMatching: Record<string, string> = {};
    
    if (userData?.em) {
      advancedMatching.em = await hashForMeta(userData.em);
    }
    if (userData?.ph) {
      advancedMatching.ph = await hashForMeta(formatPhoneForMeta(userData.ph));
    }
    if (userData?.fn) {
      advancedMatching.fn = await hashForMeta(userData.fn);
    }
    if (userData?.ln) {
      advancedMatching.ln = await hashForMeta(userData.ln);
    }
    
    window.fbq('track', 'Purchase', {
      content_type: eventData.content_type || 'product',
      content_ids: eventData.content_ids,
      currency: eventData.currency,
      value: eventData.value,
      num_items: eventData.num_items,
    }, { eventID: id });
    
    console.log('[Meta Pixel] Purchase sent', { eventId: id, value: eventData.value });
  } catch (error) {
    console.error('[Meta Pixel] Error sending Purchase:', error);
  }
}

// Send PageView event
export function sendMetaPageView(): void {
  if (typeof window === 'undefined' || !window.fbq) {
    return;
  }
  
  try {
    window.fbq('track', 'PageView');
    console.log('[Meta Pixel] PageView sent');
  } catch (error) {
    console.error('[Meta Pixel] Error sending PageView:', error);
  }
}
