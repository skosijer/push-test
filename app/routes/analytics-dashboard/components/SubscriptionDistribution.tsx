import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { UniversalChartCard } from '@/components/building-blocks/universal-chart-card/universal-chart-card';

export const subscriptionDistributionQuery = `
  SELECT 
    subscription_tier,
    COUNT(*) as organization_count 
  FROM organizations 
  GROUP BY subscription_tier 
  ORDER BY organization_count DESC
`;

export type SubscriptionDistributionData = {
  subscription_tier: string;
  organization_count: number;
};

interface SubscriptionDistributionProps {
  data: SubscriptionDistributionData[];
}

export function SubscriptionDistribution({ data }: SubscriptionDistributionProps) {
  const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];
  
  const chartConfig = {
    organization_count: {
      label: 'Organizations',
      color: 'var(--chart-1)',
    },
  };

  return (
    <UniversalChartCard
      title="Subscription Distribution"
      description="Distribution of organizations across subscription tiers"
      chartConfig={chartConfig}
    >
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="organization_count"
            nameKey="subscription_tier"
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="var(--chart-1)"
            label={({ subscription_tier, organization_count }) => 
              `${subscription_tier}: ${organization_count}`
            }
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), "Organizations"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </UniversalChartCard>
  );
}
