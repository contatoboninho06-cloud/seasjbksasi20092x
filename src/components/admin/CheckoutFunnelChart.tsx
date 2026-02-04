import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CheckoutFunnelChartProps {
  paidOrders: number;
  pendingOrders: number;
}

const COLORS = {
  paid: 'hsl(var(--success))',
  pending: 'hsl(var(--warning))',
};

export function CheckoutFunnelChart({ paidOrders, pendingOrders }: CheckoutFunnelChartProps) {
  const total = paidOrders + pendingOrders;
  
  const data = [
    { name: 'Aprovados', value: paidOrders, color: COLORS.paid },
    { name: 'Aguardando', value: pendingOrders, color: COLORS.pending },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Funil de Checkout
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value, entry: any) => (
                  <span className="text-xs text-muted-foreground">
                    {value} ({entry.payload.value})
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: '36px' }}>
            <div className="text-center">
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
