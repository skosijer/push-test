import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UniversalTableCard } from '@/components/building-blocks/universal-table-card/universal-table-card';

export const topOrganizationsQuery = `
  SELECT 
    o.organization_name,
    SUM(r.total_revenue) as revenue 
  FROM organizations o 
  JOIN revenue r ON o.organization_id = r.organization_id 
  WHERE r.date >= CURRENT_DATE - INTERVAL '30 days' 
  GROUP BY o.organization_id, o.organization_name 
  ORDER BY revenue DESC 
  LIMIT 10
`;

export type TopOrganizationsData = {
  organization_name: string;
  revenue: number;
};

interface TopOrganizationsProps {
  data: TopOrganizationsData[];
}

export function TopOrganizations({ data }: TopOrganizationsProps) {
  return (
    <UniversalTableCard
      title="Top Organizations"
      description="Top 10 organizations by revenue in the last 30 days"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((org, index) => (
            <TableRow key={index}>
              <TableCell>{org.organization_name}</TableCell>
              <TableCell className="text-right">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0
                }).format(org.revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </UniversalTableCard>
  );
}
