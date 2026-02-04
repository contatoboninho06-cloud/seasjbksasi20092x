import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, CreditCard, Clock, DollarSign, MapPin, Activity } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { RealtimeGeolocationMap } from './RealtimeGeolocationMap';

interface ActiveSession {
  session_id: string;
  current_step?: string;
  payment_method?: string;
  total?: number;
  last_activity: string;
  products?: any[];
  location?: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    country?: string;
    ip?: string;
  };
}

const globalLocationsCache = new Map<string, {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  ip?: string;
}>();

export function RealtimeAnalytics() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadActiveSessions();

    const channel = supabase
      .channel(`realtime-analytics-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'checkout_analytics'
      }, (payload) => {
        handleRealtimeEvent(payload);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          loadActiveSessions();
        }
      });

    const refreshInterval = setInterval(loadActiveSessions, 30000);

    const pruneInterval = setInterval(() => {
      setActiveSessions(prev => {
        const limit = 10 * 60 * 1000;
        const now = Date.now();
        return prev.filter(s => now - new Date(s.last_activity).getTime() <= limit);
      });
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
      clearInterval(pruneInterval);
    };
  }, []);

  const loadActiveSessions = async () => {
    try {
      const lookback = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;

      const { data, error } = await supabase
        .from('checkout_analytics')
        .select('*')
        .gte('created_at', lookback)
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      data?.forEach((event: any) => {
        if (event.location && 
            typeof event.location === 'object' && 
            typeof event.location.lat === 'number' && 
            typeof event.location.lng === 'number' && 
            event.location.lat !== 0 && 
            event.location.lng !== 0 && 
            !globalLocationsCache.has(event.session_id)) {
          globalLocationsCache.set(event.session_id, {
            lat: event.location.lat,
            lng: event.location.lng,
            city: event.location.city,
            state: event.location.state,
            country: event.location.country,
            ip: event.location.ip
          });
        }
      });

      const paymentMethodsCache = new Map<string, string>();
      data?.forEach((event: any) => {
        if (event.payment_method && !paymentMethodsCache.has(event.session_id)) {
          paymentMethodsCache.set(event.session_id, event.payment_method);
        }
      });

      const sessionsMap = new Map<string, ActiveSession>();
      data?.forEach((event: any) => {
        const existing = sessionsMap.get(event.session_id);
        const eventDate = new Date(event.created_at);
        
        if (!existing || new Date(existing.last_activity) < eventDate) {
          const location = globalLocationsCache.get(event.session_id);
          const currentStep = event.metadata?.step || event.event_type;
          const cachedMethod = paymentMethodsCache.get(event.session_id);
          const isPaymentStep = currentStep === 'payment' || 
                               currentStep === 'payment_selected' || 
                               currentStep === 'payment_method_toggled';
          const persistedPaymentMethod = cachedMethod || (isPaymentStep ? 'pix' : null);
          
          sessionsMap.set(event.session_id, {
            session_id: event.session_id,
            current_step: currentStep,
            payment_method: persistedPaymentMethod,
            total: event.total,
            last_activity: event.created_at,
            products: event.products,
            location
          });
        }
      });

      const now = Date.now();
      const active = Array.from(sessionsMap.values())
        .filter(s => s.current_step !== 'completed' && s.current_step !== 'abandoned')
        .filter(s => now - new Date(s.last_activity).getTime() <= INACTIVITY_LIMIT_MS)
        .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

      setActiveSessions(active);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleRealtimeEvent = (payload: any) => {
    const newEvent = payload.new;

    setActiveSessions(prev => {
      const existing = prev.find(s => s.session_id === newEvent.session_id);
      const filtered = prev.filter(s => s.session_id !== newEvent.session_id);

      if (newEvent.event_type === 'completed' || newEvent.event_type === 'abandoned') {
        return filtered;
      }

      if (newEvent.location && 
          typeof newEvent.location.lat === 'number' && 
          typeof newEvent.location.lng === 'number' && 
          newEvent.location.lat !== 0 && 
          newEvent.location.lng !== 0 && 
          !globalLocationsCache.has(newEvent.session_id)) {
        globalLocationsCache.set(newEvent.session_id, {
          lat: newEvent.location.lat,
          lng: newEvent.location.lng,
          city: newEvent.location.city,
          state: newEvent.location.state,
          country: newEvent.location.country,
          ip: newEvent.location.ip
        });
      }

      const location = globalLocationsCache.get(newEvent.session_id);
      
      let currentStep = 'delivery';
      if (newEvent.event_type === 'step_changed' && newEvent.metadata?.step) {
        currentStep = newEvent.metadata.step;
      } else if (newEvent.event_type === 'payment_method_toggled' || 
                 newEvent.event_type === 'payment_selected') {
        currentStep = 'payment';
      } else if (newEvent.metadata?.step) {
        currentStep = newEvent.metadata.step;
      }

      const isPaymentStep = currentStep === 'payment';
      const persistedPaymentMethod = newEvent.payment_method || 
                                     existing?.payment_method || 
                                     (isPaymentStep ? 'pix' : null);

      const updated: ActiveSession = {
        session_id: newEvent.session_id,
        current_step: currentStep,
        payment_method: persistedPaymentMethod,
        total: newEvent.total,
        last_activity: newEvent.created_at,
        products: newEvent.products,
        location
      };

      return [updated, ...filtered];
    });
  };

  const stats = useMemo(() => {
    const total = activeSessions.length;
    const inPayment = activeSessions.filter(s => s.current_step === 'payment').length;
    const potentialRevenue = activeSessions.reduce((sum, s) => sum + (s.total || 0), 0);
    return { total, inPayment, potentialRevenue };
  }, [activeSessions]);

  const getStepInfo = (step?: string) => {
    switch (step) {
      case 'delivery':
        return { label: 'Entrega', color: 'bg-blue-500', textColor: 'text-blue-500' };
      case 'identification':
        return { label: 'Identificação', color: 'bg-orange-500', textColor: 'text-orange-500' };
      case 'payment':
        return { label: 'Pagamento', color: 'bg-green-500', textColor: 'text-green-500' };
      default:
        return { label: step || 'Início', color: 'bg-muted', textColor: 'text-muted-foreground' };
    }
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins === 1) return '1 min';
    return `${mins} min`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Column - Stats + Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-destructive" />
              Tempo Real
              {isConnected && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
              )}
            </CardTitle>
            <Badge variant="secondary" className="font-normal">
              {stats.total} {stats.total === 1 ? 'visitante' : 'visitantes'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <CreditCard className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <p className="text-lg font-bold">{stats.inPayment}</p>
              <p className="text-xs text-muted-foreground">Pagamento</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <DollarSign className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{formatPrice(stats.potentialRevenue)}</p>
              <p className="text-xs text-muted-foreground">Potencial</p>
            </div>
          </div>

          {/* Sessions List */}
          {activeSessions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum visitante no checkout</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {activeSessions.slice(0, 10).map((session) => {
                  const stepInfo = getStepInfo(session.current_step);
                  return (
                    <div
                      key={session.session_id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className={cn("h-2 w-2 rounded-full flex-shrink-0", stepInfo.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-medium", stepInfo.textColor)}>
                            {stepInfo.label}
                          </span>
                          {session.location?.city && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location.city}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {session.total && (
                            <span className="font-medium text-foreground">
                              {formatPrice(session.total)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(session.last_activity)}
                          </span>
                          {session.location?.ip && (
                            <span className="text-xs opacity-60">
                              {session.location.ip}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

        </CardContent>
      </Card>

      {/* Right Column - Map */}
      <RealtimeGeolocationMap activeSessions={activeSessions} />
    </div>
  );
}
