import { useMemo } from 'react';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types/database';
import { DateRange } from './DateRangeFilter';

interface SalesChartProps {
  orders: Order[];
  dateRange: DateRange;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

export function SalesChart({ orders, dateRange }: SalesChartProps) {
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayOrders = orders.filter(order => {
        const orderDate = startOfDay(new Date(order.created_at));
        return orderDate.getTime() === dayStart.getTime() && order.payment_status === 'paid';
      });
      
      const total = dayOrders.reduce((sum, order) => sum + order.total, 0);
      
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        dayName: format(day, 'EEE', { locale: ptBR }),
        value: total,
        orders: dayOrders.length,
      };
    });
  }, [orders, dateRange]);

  const totalRevenue = chartData.reduce((sum, day) => sum + day.value, 0);

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Vendas do Período
          </CardTitle>
          <span className="text-lg font-bold text-success">
            {formatPrice(totalRevenue)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey={chartData.length <= 7 ? "dayName" : "date"} 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [formatPrice(value), 'Vendas']}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
