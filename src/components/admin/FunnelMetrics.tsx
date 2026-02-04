import { TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FunnelMetricsProps {
  approvalRate: number;
  pendingValue: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

export function FunnelMetrics({ approvalRate, pendingValue }: FunnelMetricsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Métricas de Funil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
            <p className="text-lg font-bold text-success">{approvalRate.toFixed(1)}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Valor Pendente</p>
            <p className="text-lg font-bold text-warning">{formatPrice(pendingValue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
