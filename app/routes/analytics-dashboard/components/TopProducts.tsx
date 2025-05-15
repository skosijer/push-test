import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UniversalTableCard } from '@/components/building-blocks/universal-table-card/universal-table-card';

export const topProductsQuery = `
  SELECT 
    p.product_name,
    SUM(si.quantity) as total_quantity,
    SUM(si.total_price) as total_revenue 
  FROM products p 
  JOIN sale_items si ON p.product_id = si.product_id 
  JOIN sales s ON si.sale_id = s.sale_id 
  WHERE s.sale_date >= CURRENT_DATE - INTERVAL '30 days' 
  GROUP BY p.product_id, p.product_name 
  ORDER BY total_revenue DESC 
  LIMIT 5
`;

export type TopProductsData = {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
};

interface TopProductsProps {
  data: TopProductsData[];
}

export function TopProducts({ data }: TopProductsProps) {
  return (
    <UniversalTableCard
      title="Top Products"
      description="Top 5 selling products by revenue in the last 30 days"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((product, index) => (
            <TableRow key={index}>
              <TableCell>{product.product_name}</TableCell>
              <TableCell className="text-right">{product.total_quantity.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0
                }).format(product.total_revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </UniversalTableCard>
  );
}
