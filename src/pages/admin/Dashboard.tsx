import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RealtimeTabContent } from '@/components/admin/RealtimeTabContent';
import { DateRangeFilter, DateRange, getDateRange } from '@/components/admin/DateRangeFilter';
import { OverviewStats } from '@/components/admin/OverviewStats';
import { RevenueGoalCard } from '@/components/admin/RevenueGoalCard';
import { SalesChart } from '@/components/admin/SalesChart';
import { CheckoutFunnelChart } from '@/components/admin/CheckoutFunnelChart';
import { FunnelMetrics } from '@/components/admin/FunnelMetrics';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'realtime'>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('today'));

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  }, [orders, dateRange]);

  // Calculate metrics from filtered orders
  const metrics = useMemo(() => {
    const paidOrders = filteredOrders.filter(o => o.payment_status === 'paid');
    const pendingOrders = filteredOrders.filter(o => o.payment_status === 'pending');
    
    const approvedRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingValue = pendingOrders.reduce((sum, o) => sum + o.total, 0);
    const averageTicket = paidOrders.length > 0 ? approvedRevenue / paidOrders.length : 0;
    const approvalRate = (paidOrders.length + pendingOrders.length) > 0 
      ? (paidOrders.length / (paidOrders.length + pendingOrders.length)) * 100 
      : 0;

    return {
      approvedRevenue,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: pendingOrders.length,
      pendingValue,
      averageTicket,
      approvalRate,
    };
  }, [filteredOrders]);

  // Calculate total revenue for goal (all time paid orders)
  const totalRevenue = useMemo(() => {
    if (!orders) return 0;
    return orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  const recentOrders = filteredOrders.slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="w-full overflow-x-auto scrollbar-hide">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Tabs Header */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'realtime')}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="realtime" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Tempo Real
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px] font-medium">
                Live
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Revenue Goal */}
            <RevenueGoalCard currentRevenue={totalRevenue} />
            
            {/* Stats Grid */}
            <OverviewStats
              approvedRevenue={metrics.approvedRevenue}
              paidOrders={metrics.paidOrdersCount}
              pendingOrders={metrics.pendingOrdersCount}
              pendingValue={metrics.pendingValue}
              averageTicket={metrics.averageTicket}
              isLoading={isLoading}
            />

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
              <SalesChart orders={filteredOrders} dateRange={dateRange} />
              <CheckoutFunnelChart 
                paidOrders={metrics.paidOrdersCount} 
                pendingOrders={metrics.pendingOrdersCount} 
              />
            </div>

            {/* Bottom Row */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Recent Orders */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium">Pedidos Recentes</CardTitle>
                  <Link to="/admin/pedidos">
                    <Button variant="ghost" size="sm" className="text-xs">Ver todos</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Nenhum pedido no período
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {order.customer_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">
                              {formatPrice(order.total)}
                            </p>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              order.payment_status === 'paid' ? "bg-success/10 text-success" :
                              order.payment_status === 'failed' ? "bg-destructive/10 text-destructive" :
                              "bg-warning/10 text-warning"
                            )}>
                              {order.payment_status === 'paid' ? 'Pago' :
                               order.payment_status === 'pending' ? 'Pendente' :
                               order.payment_status === 'failed' ? 'Falhou' : 'Reembolsado'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Funnel Metrics */}
              <FunnelMetrics 
                approvalRate={metrics.approvalRate} 
                pendingValue={metrics.pendingValue} 
              />
            </div>
          </TabsContent>

          {/* Realtime Tab Content */}
          <TabsContent value="realtime" className="mt-6">
            <RealtimeTabContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
