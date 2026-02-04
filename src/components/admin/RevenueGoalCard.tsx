import { Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RevenueGoalCardProps {
  currentRevenue: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const formatShortPrice = (price: number) => {
  if (price >= 1000000) {
    return `R$ ${(price / 1000000).toFixed(1)}M`;
  }
  if (price >= 1000) {
    return `R$ ${(price / 1000).toFixed(0)}k`;
  }
  return formatPrice(price);
};

export function RevenueGoalCard({ currentRevenue }: RevenueGoalCardProps) {
  // Calcula meta dinâmica de 10k em 10k
  const goal = currentRevenue === 0 
    ? 10000 
    : Math.ceil(currentRevenue / 10000) * 10000;
  
  // Se atingiu exatamente a meta, próxima meta é +10k
  const adjustedGoal = currentRevenue > 0 && currentRevenue === goal 
    ? goal + 10000 
    : goal;
  
  const progress = (currentRevenue / adjustedGoal) * 100;
  const remaining = adjustedGoal - currentRevenue;
  const exceeded = currentRevenue > adjustedGoal;
  
  // Escala: meta anterior e meta atual
  const minValue = Math.max(0, adjustedGoal - 10000);
  const maxValue = adjustedGoal;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Meta de Faturamento
          </CardTitle>
          <span className="text-xl font-bold text-success">
            {formatPrice(currentRevenue)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Progress 
            value={progress} 
            className="h-3 bg-muted"
          />
          {exceeded && (
            <div 
              className="absolute top-0 left-0 h-3 bg-success rounded-full transition-all"
              style={{ width: '100%' }}
            />
          )}
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatShortPrice(minValue)}</span>
          <span>{formatShortPrice(maxValue)}</span>
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          {exceeded ? (
            <span className="text-success">
              Meta atingida! Excedeu em {formatPrice(currentRevenue - adjustedGoal)}
            </span>
          ) : (
            <>
              Faltam <span className="font-medium text-foreground">{formatPrice(remaining)}</span> para {formatPrice(adjustedGoal)}
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
