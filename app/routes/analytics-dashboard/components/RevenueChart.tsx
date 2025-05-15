import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UniversalChartCard } from '@/components/building-blocks/universal-chart-card/universal-chart-card';

export const revenueChartQuery = `
  SELECT date, total_revenue 
  FROM revenue 
  WHERE date >= CURRENT_DATE - INTERVAL '30 days' 
  ORDER BY date
`;

export type RevenueChartData = {
  date: string;
  total_revenue: number;
};

interface RevenueChartProps {
  data: RevenueChartData[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const chartConfig = {
    total_revenue: {
      label: 'Revenue',
      color: 'var(--chart-1)',
    },
  };

  return (
    <UniversalChartCard
      title="Revenue Trend"
      description="Daily revenue for the last 30 days"
      chartConfig={chartConfig}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis 
            tickFormatter={(value) => 
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(value)
            }
          />
          <Tooltip 
            formatter={(value: number) => 
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
              }).format(value)
            }
          />
          <Area
            type="monotone"
            dataKey="total_revenue"
            stroke="var(--chart-1-stroke)"
            fill="var(--chart-1)"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </UniversalChartCard>
  );
}
