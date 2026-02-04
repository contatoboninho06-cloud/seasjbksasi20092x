import { Search, Star, Clock, MapPin, BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoreSettings, useIsStoreOpen } from '@/hooks/useStoreSettings';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  onSearch?: (query: string) => void;
}

export function MobileHeader({ onSearch }: MobileHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: settings, isLoading: settingsLoading } = useStoreSettings();
  const { isOpen, isLoading: storeStatusLoading } = useIsStoreOpen();

  const isLoading = settingsLoading || storeStatusLoading;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="sticky top-0 z-40 bg-background">
      {/* Banner with Status Badge */}
      <div className="relative">
        {/* Banner Image */}
        <div className="h-32 w-full overflow-hidden bg-gradient-to-r from-primary/20 to-primary/5">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : settings?.banner_url ? (
            <img
              src={settings.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-orange-500/80 to-red-500/80" />
          )}
        </div>

        {/* Status Badge - Só mostra após carregar */}
        {!isLoading && (
          <div className={cn(
            "absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg",
            isOpen ? "bg-green-500" : "bg-red-500"
          )}>
            {isOpen ? 'ABERTO AGORA' : 'FECHADO'}
          </div>
        )}

        {/* Logo - positioned to overlap banner */}
        <div className="absolute -bottom-8 left-4">
          {isLoading ? (
            <Skeleton className="h-20 w-20 rounded-full border-4 border-background" />
          ) : settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.store_name || 'Logo'}
              className="h-20 w-20 rounded-full object-cover border-4 border-background shadow-lg"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-lg">
              <span className="text-3xl">🔥</span>
            </div>
          )}
        </div>
      </div>

      {/* Store Info */}
      <div className="px-4 pt-10 pb-3 border-b border-border">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-foreground">
                {settings?.store_name || 'Churrascaria Gourmet'}
              </h1>
              <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" />
            </div>
            
            <div className="flex items-center gap-1 text-sm mt-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">4.9</span>
              <span className="text-muted-foreground">(1.368 avaliações)</span>
            </div>

            {/* Delivery Info */}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>1,6 km</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{settings?.delivery_time_min || 30}-{settings?.delivery_time_max || 60} min</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar no cardápio..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 bg-muted/50 border-0"
          />
        </div>
      </div>
    </header>
  );
}
