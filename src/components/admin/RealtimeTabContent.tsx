import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, CreditCard, DollarSign, MapPin, Activity, Clock, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Lazy load map component
const GeolocationMapInner = lazy(() => 
  import('./GeolocationMapInner').then(mod => ({ default: mod.GeolocationMapInner }))
);

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

interface RecentEvent {
  id: string;
  session_id: string;
  event_type: string;
  step?: string;
  created_at: string;
  total?: number;
  location?: {
    city?: string;
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

export function RealtimeTabContent() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadActiveSessions();
    loadRecentEvents();

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
          loadRecentEvents();
        }
      });

    const refreshInterval = setInterval(() => {
      loadActiveSessions();
      loadRecentEvents();
    }, 30000);

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

  const loadRecentEvents = async () => {
    try {
      const lookback = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('checkout_analytics')
        .select('id, session_id, event_type, metadata, created_at, total, location')
        .gte('created_at', lookback)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      setRecentEvents(data?.map((e: any) => ({
        id: e.id,
        session_id: e.session_id,
        event_type: e.event_type,
        step: e.metadata?.step,
        created_at: e.created_at,
        total: e.total,
        location: e.location,
      })) || []);
    } catch (error) {
      console.error('Error loading recent events:', error);
    }
  };

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

    // Add to recent events
    setRecentEvents(prev => {
      const event: RecentEvent = {
        id: newEvent.id,
        session_id: newEvent.session_id,
        event_type: newEvent.event_type,
        step: newEvent.metadata?.step,
        created_at: newEvent.created_at,
        total: newEvent.total,
        location: newEvent.location,
      };
      return [event, ...prev.slice(0, 9)];
    });

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
    
    // Calculate average time (mock for now, would need first_activity tracking)
    const avgTime = 0;
    
    // Count completed in last 10 min
    const recentCompleted = recentEvents.filter(e => e.event_type === 'completed').length;
    
    return { total, inPayment, potentialRevenue, avgTime, recentCompleted };
  }, [activeSessions, recentEvents]);

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

  const getEventLabel = (event: RecentEvent) => {
    if (event.event_type === 'started') return 'Iniciou checkout';
    if (event.event_type === 'completed') return 'Finalizou compra';
    if (event.event_type === 'abandoned') return 'Abandonou';
    if (event.event_type === 'step_changed') {
      if (event.step === 'identification') return 'Identificação';
      if (event.step === 'payment') return 'Pagamento';
      return event.step || 'Mudou etapa';
    }
    return event.event_type;
  };

  // Prepare locations for map
  const mapLocations = useMemo(() => {
    return activeSessions
      .filter(session => {
        const loc = session.location;
        return loc && 
               typeof loc.lat === 'number' && 
               typeof loc.lng === 'number' &&
               loc.lat !== 0 && loc.lng !== 0 &&
               !isNaN(loc.lat) && !isNaN(loc.lng);
      })
      .map(session => ({
        lat: session.location!.lat,
        lng: session.location!.lng,
        city: session.location?.city,
        state: session.location?.state,
        country: session.location?.country,
        step: session.current_step,
        total: session.total,
        payment_method: session.payment_method,
        created_at: session.last_activity,
        session_id: session.session_id,
      }));
  }, [activeSessions]);

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Main Grid: Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Stats Cards - Grid on mobile, vertical on desktop */}
        <div className="col-span-full lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 lg:gap-3">
          {/* Online Now */}
          <Card className="bg-card/50">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">Online Agora</p>
                  <p className="text-xl lg:text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Purchased (10min) */}
          <Card className="bg-card/50">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">Comprou (10min)</p>
                  <p className="text-xl lg:text-2xl font-bold">{stats.recentCompleted}</p>
                </div>
                <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Payment Step */}
          <Card className="bg-card/50">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">Etapa Pagamento</p>
                  <p className="text-xl lg:text-2xl font-bold">{stats.inPayment}</p>
                </div>
                <CreditCard className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Potential Value */}
          <Card className="bg-card/50">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">Valor Potencial</p>
                  <p className="text-lg lg:text-2xl font-bold">{formatPrice(stats.potentialRevenue)}</p>
                </div>
                <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Average Time - Hidden on mobile to keep grid balanced */}
          <Card className="bg-card/50 hidden sm:block">
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">Tempo Médio</p>
                  <p className="text-xl lg:text-2xl font-bold">{stats.avgTime}min</p>
                </div>
                <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Map */}
        <div className="col-span-full lg:col-span-7">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm lg:text-base font-medium">
                  Localização em Tempo Real
                </CardTitle>
                {/* Legend - Inline in header */}
                <div className="flex items-center gap-2 lg:gap-3 text-[10px] lg:text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="hidden sm:inline">Entrega</span>
                    <span className="sm:hidden">E</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="hidden sm:inline">Ident.</span>
                    <span className="sm:hidden">I</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="hidden sm:inline">Pgto</span>
                    <span className="sm:hidden">P</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-[360px] sm:h-[400px] lg:h-[420px] rounded-lg overflow-hidden bg-muted/30">
                <Suspense 
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  }
                >
                  <GeolocationMapInner locations={mapLocations} />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Active Sessions */}
        <div className="col-span-full lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-medium">
                <Activity className="h-4 w-4" />
                Sessões Ativas
                {isConnected && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {activeSessions.length === 0 ? (
                <div className="flex items-center justify-center h-[280px] lg:h-[420px] text-muted-foreground">
                  <p className="text-sm">Nenhuma sessão ativa</p>
                </div>
              ) : (
                <ScrollArea className="h-[280px] sm:h-[340px] lg:h-[420px]">
                  <div className="space-y-2 pr-2">
                    {activeSessions.slice(0, 15).map((session) => {
                      const stepInfo = getStepInfo(session.current_step);
                      return (
                        <div
                          key={session.session_id}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", stepInfo.color)} />
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
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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
                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
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
        </div>
      </div>

      {/* Bottom Section - Recent Events */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Clock className="h-4 w-4" />
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-1 bg-blue-500 rounded"></span>
              <span className="h-3 w-1 bg-orange-500 rounded"></span>
              <span className="h-3 w-1 bg-green-500 rounded"></span>
            </span>
            Eventos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum evento recente</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {recentEvents.slice(0, 8).map((event) => {
                const stepInfo = getStepInfo(event.step || event.event_type);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg"
                  >
                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", 
                      event.event_type === 'completed' ? 'bg-green-500' :
                      event.event_type === 'abandoned' ? 'bg-red-500' :
                      stepInfo.color
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getEventLabel(event)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTimeAgo(event.created_at)}
                        {event.location?.city && ` • ${event.location.city}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
