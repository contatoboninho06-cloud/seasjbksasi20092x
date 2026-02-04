import { Suspense, lazy, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load map component to avoid SSR issues with Leaflet
const GeolocationMapInner = lazy(() => 
  import('./GeolocationMapInner').then(mod => ({ default: mod.GeolocationMapInner }))
);

interface ActiveSession {
  session_id: string;
  current_step?: string;
  payment_method?: string;
  total?: number;
  last_activity: string;
  location?: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    country?: string;
    ip?: string;
  };
}

interface RealtimeGeolocationMapProps {
  activeSessions: ActiveSession[];
}

export function RealtimeGeolocationMap({ activeSessions }: RealtimeGeolocationMapProps) {
  const locations = useMemo(() => {
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

  const sessionsWithLocation = locations.length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            Localização
          </CardTitle>
          {sessionsWithLocation > 0 && (
            <Badge variant="secondary" className="font-normal text-xs">
              {sessionsWithLocation} no mapa
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="h-[180px] rounded-lg overflow-hidden bg-muted/50">
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MapPin className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Sem localizações ativas</p>
            </div>
          ) : (
            <Suspense 
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <GeolocationMapInner locations={locations} />
            </Suspense>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            Entrega
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            Identificação
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Pagamento
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
