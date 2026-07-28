import { Edit, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminTablePagination from './admin-table-pagination';
import { DatasetItem } from '@/lib/types/datasets';
import { NextLink } from '@/components';

interface ProTaxonomiesTableSectionProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    level?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  proTaxonomies: DatasetItem[];
}

interface FlatProTaxonomy extends DatasetItem {
  level: 'category' | 'subcategory';
  parentId?: string;
  parentLabel?: string;
  type?: 'freelancer' | 'company';
}

// Flatten the hierarchical taxonomy structure with proper DatasetItem handling
function flattenProTaxonomies(proTaxonomies: DatasetItem[]): FlatProTaxonomy[] {
  const flat: FlatProTaxonomy[] = [];

  proTaxonomies.forEach((category: DatasetItem) => {
    flat.push({
      ...category,
      level: 'category',
    });

    category.children?.forEach((subcategory: DatasetItem) => {
      flat.push({
        ...subcategory,
        level: 'subcategory',
        parentId: category.id,
        parentLabel: category.label,
        type: subcategory.type as 'freelancer' | 'company',
      });
    });
  });

  return flat;
}

export async function AdminProTaxonomiesTableSection({
  searchParams,
  proTaxonomies,
}: ProTaxonomiesTableSectionProps) {
  const page = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '20');
  const search = searchParams.search?.toLowerCase() || '';
  const levelFilter = searchParams.level || 'all';
  const typeFilter = searchParams.type || 'all';

  // Flatten and filter taxonomies
  let taxonomies = flattenProTaxonomies(proTaxonomies);

  // Apply filters
  if (search) {
    taxonomies = taxonomies.filter(
      (t) =>
        t.label.toLowerCase().includes(search) ||
        t.slug.toLowerCase().includes(search) ||
        t.parentLabel?.toLowerCase().includes(search),
    );
  }

  if (levelFilter !== 'all') {
    taxonomies = taxonomies.filter((t) => t.level === levelFilter);
  }

  if (typeFilter !== 'all') {
    taxonomies = taxonomies.filter((t) => t.type === typeFilter);
  }

  // Pagination
  const total = taxonomies.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedTaxonomies = taxonomies.slice(start, end);

  const getLevelBadgeVariant = (
    level: string,
  ): 'default' | 'secondary' | 'outline' => {
    switch (level) {
      case 'category':
        return 'default';
      case 'subcategory':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className='space-y-4'>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className='w-[100px]'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTaxonomies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-center text-muted-foreground'
                >
                  No taxonomies found
                </TableCell>
              </TableRow>
            ) : (
              paginatedTaxonomies.map((taxonomy) => (
                <TableRow key={taxonomy.id}>
                  <TableCell className='font-medium'>
                    <div className='flex items-center gap-2'>
                      {taxonomy.level === 'subcategory' && (
                        <ChevronRight className='h-4 w-4 text-muted-foreground' />
                      )}
                      {taxonomy.label}
                    </div>
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    {taxonomy.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLevelBadgeVariant(taxonomy.level)}>
                      {taxonomy.level}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {taxonomy.parentLabel || '—'}
                  </TableCell>
                  <TableCell>
                    {taxonomy.type ? (
                      <Badge variant='outline'>{taxonomy.type}</Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size='icon' variant='ghost' asChild>
                      <NextLink href={`/admin/taxonomies/pro/${taxonomy.id}`}>
                        <Edit className='h-4 w-4' />
                      </NextLink>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminTablePagination
        currentPage={page}
        totalPages={totalPages}
        currentLimit={limit}
        basePath='/admin/taxonomies/pro'
        pageSizeOptions={[12, 20, 50, 100]}
      />
    </div>
  );
}
