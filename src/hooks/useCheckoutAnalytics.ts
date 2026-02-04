import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationData {
  ip: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

interface TrackEventParams {
  eventType: 'started' | 'abandoned' | 'completed' | 'payment_selected' | 'step_changed' | 'payment_method_toggled';
  paymentMethod?: 'pix' | 'card';
  products?: any[];
  subtotal?: number;
  shippingCost?: number;
  discount?: number;
  total?: number;
  metadata?: Record<string, any>;
  step?: string;
}

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutos

function getOrCreateSessionId(): { sessionId: string; isResumed: boolean } {
  const stored = localStorage.getItem('checkout_session_data');
  
  if (stored) {
    try {
      const { sessionId, timestamp } = JSON.parse(stored);
      const age = Date.now() - timestamp;
      
      if (age < SESSION_EXPIRY_MS && sessionId) {
        localStorage.setItem('checkout_session_data', JSON.stringify({
          sessionId,
          timestamp: Date.now()
        }));
        return { sessionId, isResumed: true };
      }
    } catch (e) {}
  }
  
  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('checkout_session_data', JSON.stringify({
    sessionId: newSessionId,
    timestamp: Date.now()
  }));
  return { sessionId: newSessionId, isResumed: false };
}

export function useCheckoutAnalytics(storeId?: string) {
  const sessionDataRef = useRef(getOrCreateSessionId());
  const sessionIdRef = useRef<string>(sessionDataRef.current.sessionId);
  const isResumedSessionRef = useRef<boolean>(sessionDataRef.current.isResumed);
  
  const startedRef = useRef(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storeIdRef = useRef<string | undefined>(storeId);
  const cachedLocationRef = useRef<LocationData | null>(null);
  const locationPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    storeIdRef.current = storeId;
  }, [storeId]);

  // PRÉ-CARREGAR geolocalização ao montar
  useEffect(() => {
    if (cachedLocationRef.current) {
      locationPromiseRef.current = Promise.resolve();
      return;
    }
    
    locationPromiseRef.current = supabase.functions.invoke('get-client-location')
      .then(({ data: geoData, error: geoError }) => {
        if (!geoError && geoData && geoData.city && geoData.lat && geoData.lng) {
          cachedLocationRef.current = geoData as LocationData;
        }
      })
      .catch(() => {});
  }, []);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      if (startedRef.current) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        navigator.sendBeacon(
          `${supabaseUrl}/rest/v1/checkout_analytics`,
          JSON.stringify({
            session_id: sessionIdRef.current,
            event_type: 'abandoned',
            created_at: new Date().toISOString(),
            store_id: storeIdRef.current || null,
          })
        );
        startedRef.current = false;
      }
    }, 10 * 60 * 1000); // 10 minutos
  };

  useEffect(() => {
    sessionStorage.setItem('checkout_session_id', sessionIdRef.current);

    const handleBeforeUnload = () => {
      if (startedRef.current) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        navigator.sendBeacon(
          `${supabaseUrl}/rest/v1/checkout_analytics`,
          JSON.stringify({
            session_id: sessionIdRef.current,
            event_type: 'abandoned',
            created_at: new Date().toISOString(),
            store_id: storeIdRef.current || null,
          })
        );
        startedRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && startedRef.current) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        navigator.sendBeacon(
          `${supabaseUrl}/rest/v1/checkout_analytics`,
          JSON.stringify({
            session_id: sessionIdRef.current,
            event_type: 'abandoned',
            created_at: new Date().toISOString(),
            store_id: storeIdRef.current || null,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  const trackEvent = useCallback(async (params: TrackEventParams) => {
    const { eventType, paymentMethod, products, subtotal, shippingCost, discount, total, metadata, step } = params;

    // Aguardar pré-carregamento de geolocalização (máx 2s)
    if (locationPromiseRef.current) {
      await Promise.race([
        locationPromiseRef.current,
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
    }

    if (eventType === 'started') {
      startedRef.current = true;
      resetInactivityTimer();
    }

    if (eventType === 'completed' || eventType === 'abandoned') {
      startedRef.current = false;
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    } else if (startedRef.current) {
      resetInactivityTimer();
    }

    const enrichedMetadata = {
      ...metadata,
      ...(step && { step }),
    };

    let locationData: LocationData | null = cachedLocationRef.current;
    
    const needsLocation = !cachedLocationRef.current && (
      eventType === 'step_changed' || 
      eventType === 'started' ||
      isResumedSessionRef.current
    );
    
    if (needsLocation) {
      try {
        const { data: geoData, error: geoError } = await supabase.functions.invoke('get-client-location');
        
        if (!geoError && geoData && geoData.city && geoData.lat && geoData.lng) {
          locationData = geoData as LocationData;
          cachedLocationRef.current = locationData;
        }
      } catch (err) {}
    }

    const payload = {
      session_id: sessionIdRef.current,
      event_type: eventType,
      payment_method: paymentMethod || null,
      products: products || null,
      subtotal: subtotal || null,
      shipping_cost: shippingCost || 0,
      discount: discount || 0,
      total: total || null,
      metadata: enrichedMetadata || null,
      location: locationData || null,
      store_id: storeIdRef.current || null,
    };

    try {
      const { error } = await supabase.from('checkout_analytics').insert(payload as any);

      if (error) {
        console.error('Analytics insert error:', error);
      }
    } catch (exception) {
      console.error('Analytics exception:', exception);
    }
  }, []);

  return { trackEvent, sessionId: sessionIdRef.current };
}
