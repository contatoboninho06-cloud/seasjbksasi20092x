import { DollarSign, ShoppingBag, Clock, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface OverviewStatsProps {
  approvedRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  pendingValue: number;
  averageTicket: number;
  isLoading?: boolean;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

export function OverviewStats({
  approvedRevenue,
  paidOrders,
  pendingOrders,
  pendingValue,
  averageTicket,
  isLoading = false,
}: OverviewStatsProps) {
  const stats = [
    {
      title: 'Receita Aprovada',
      value: formatPrice(approvedRevenue),
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pedidos Pagos',
      value: paidOrders.toString(),
      icon: ShoppingBag,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Aguardando Pagamento',
      value: pendingOrders.toString(),
      subtitle: formatPrice(pendingValue),
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Ticket Médio',
      value: formatPrice(averageTicket),
      icon: Receipt,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <>
                    <p className={cn("text-xl font-bold mt-1", stat.color)}>{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                    )}
                  </>
                )}
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
