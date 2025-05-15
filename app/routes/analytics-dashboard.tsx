import { useLoaderData } from '@remix-run/react';
import { executePostgresQuery } from '@/db/execute-query';
import { WithErrorHandling } from '@/components/hoc/error-handling-wrapper/error-handling-wrapper';

import {
  KeyMetrics,
  KeyMetricsData,
  keyMetricsQuery,
} from './analytics-dashboard/components/KeyMetrics';
import {
  RevenueMetrics,
  RevenueMetricsData,
  revenueMetricsQuery,
} from './analytics-dashboard/components/RevenueMetrics';
import {
  RevenueChart,
  RevenueChartData,
  revenueChartQuery,
} from './analytics-dashboard/components/RevenueChart';
import {
  TopOrganizations,
  TopOrganizationsData,
  topOrganizationsQuery,
} from './analytics-dashboard/components/TopOrganizations';
import {
  TopProducts,
  TopProductsData,
  topProductsQuery,
} from './analytics-dashboard/components/TopProducts';
import {
  SubscriptionDistribution,
  SubscriptionDistributionData,
  subscriptionDistributionQuery,
} from './analytics-dashboard/components/SubscriptionDistribution';

export async function loader() {
  const [
    keyMetrics,
    revenueMetrics,
    revenueChart,
    topOrganizations,
    topProducts,
    subscriptionDistribution,
  ] = await Promise.all([
    executePostgresQuery<KeyMetricsData>(keyMetricsQuery),
    executePostgresQuery<RevenueMetricsData>(revenueMetricsQuery),
    executePostgresQuery<RevenueChartData>(revenueChartQuery),
    executePostgresQuery<TopOrganizationsData>(topOrganizationsQuery),
    executePostgresQuery<TopProductsData>(topProductsQuery),
    executePostgresQuery<SubscriptionDistributionData>(subscriptionDistributionQuery),
  ]);

  return {
    keyMetrics,
    revenueMetrics,
    revenueChart,
    topOrganizations,
    topProducts,
    subscriptionDistribution,
  };
}

export default function AnalyticsDashboard() {
  const {
    keyMetrics,
    revenueMetrics,
    revenueChart,
    topOrganizations,
    topProducts,
    subscriptionDistribution,
  } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Business Analytics Dashboard</h1>
      
      <WithErrorHandling
        queryData={keyMetrics}
        render={(data) => <KeyMetrics data={data} />}
      />
      
      <WithErrorHandling
        queryData={revenueMetrics}
        render={(data) => <RevenueMetrics data={data} />}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WithErrorHandling
          queryData={revenueChart}
          render={(data) => <RevenueChart data={data} />}
        />
        <WithErrorHandling
          queryData={subscriptionDistribution}
          render={(data) => <SubscriptionDistribution data={data} />}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WithErrorHandling
          queryData={topOrganizations}
          render={(data) => <TopOrganizations data={data} />}
        />
        <WithErrorHandling
          queryData={topProducts}
          render={(data) => <TopProducts data={data} />}
        />
      </div>
    </div>
  );
}
