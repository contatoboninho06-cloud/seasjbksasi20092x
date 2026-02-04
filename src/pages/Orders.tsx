import { Link, useNavigate } from 'react-router-dom';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowRight, Clock, CheckCircle, XCircle, Truck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderStatus } from '@/types/database';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  confirmed: { label: 'Confirmado', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  preparing: { label: 'Preparando', icon: Package, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  out_for_delivery: { label: 'Saiu para Entrega', icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export default function OrdersPage() {
  useForceLightTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Meus Pedidos</h1>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center pb-20">
          <div className="text-center px-4">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Faça login</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Entre para ver seus pedidos
            </p>
            <Link to="/login">
              <Button>Entrar</Button>
            </Link>
          </div>
        </main>
        
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Meus Pedidos</h1>
        </div>
      </header>

      <main className="flex-1 pb-20">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : orders?.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center px-4">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">Nenhum pedido</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Faça seu primeiro pedido agora
              </p>
              <Link to="/">
                <Button>Ver Cardápio</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {orders?.map((order) => {
              const config = statusConfig[order.status as OrderStatus];
              const StatusIcon = config.icon;
              
              return (
                <Link key={order.id} to={`/pedidos/${order.id}`}>
                  <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50 active:bg-muted/50 transition-colors">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full flex-shrink-0",
                      config.bgColor
                    )}>
                      <StatusIcon className={cn("h-6 w-6", config.color)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">
                          Pedido #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <span className="font-bold text-green-600">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          config.bgColor, config.color
                        )}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      
      <BottomNavigation />
    </div>
  );
}
