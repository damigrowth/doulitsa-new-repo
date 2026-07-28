import { Edit, Star } from 'lucide-react';
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

interface ServiceTaxonomiesTableSectionProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    level?: string;
    featured?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  serviceTaxonomies: DatasetItem[];
}

interface FlatTaxonomy extends DatasetItem {
  level: 'category' | 'subcategory' | 'subdivision';
  parentId?: string;
  parentLabel?: string;
  featured?: boolean;
}

// Flatten the hierarchical taxonomy structure with proper DatasetItem handling
function flattenTaxonomies(serviceTaxonomies: DatasetItem[]): FlatTaxonomy[] {
  const flat: FlatTaxonomy[] = [];

  serviceTaxonomies.forEach((category: DatasetItem) => {
    flat.push({
      ...category,
      level: 'category',
      featured: category.featured,
      icon: category.icon,
    });

    category.children?.forEach((subcategory: DatasetItem) => {
      flat.push({
        ...subcategory,
        level: 'subcategory',
        parentId: category.id,
        parentLabel: category.label,
      });

      subcategory.children?.forEach((subdivision: DatasetItem) => {
        flat.push({
          ...subdivision,
          level: 'subdivision',
          parentId: subcategory.id,
          parentLabel: subcategory.label,
        });
      });
    });
  });

  return flat;
}

export async function AdminServiceTaxonomiesTableSection({
  searchParams,
  serviceTaxonomies,
}: ServiceTaxonomiesTableSectionProps) {
  const page = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '20');
  const search = searchParams.search?.toLowerCase() || '';
  const levelFilter = searchParams.level || 'all';
  const featuredFilter = searchParams.featured || 'all';

  // Flatten and filter taxonomies
  let taxonomies = flattenTaxonomies(serviceTaxonomies);

  // Apply filters
  if (search) {
    taxonomies = taxonomies.filter(
      (t) =>
        t.label.toLowerCase().includes(search) ||
        t.slug.toLowerCase().includes(search),
    );
  }

  if (levelFilter !== 'all') {
    taxonomies = taxonomies.filter((t) => t.level === levelFilter);
  }

  if (featuredFilter !== 'all') {
    taxonomies = taxonomies.filter((t) => {
      if (featuredFilter === 'featured') return t.featured === true;
      if (featuredFilter === 'not-featured') return t.featured !== true;
      return true;
    });
  }

  // Calculate pagination
  const totalCount = taxonomies.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTaxonomies = taxonomies.slice(startIndex, endIndex);

  return (
    <div className='space-y-4'>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className='w-[100px]'>Featured</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTaxonomies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='h-24 text-center'>
                  No taxonomies found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTaxonomies.map((taxonomy) => (
                <TableRow key={taxonomy.id}>
                  <TableCell className='font-mono text-xs'>
                    {taxonomy.id}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {taxonomy.label}
                  </TableCell>
                  <TableCell className='font-mono text-xs text-muted-foreground'>
                    {taxonomy.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{taxonomy.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center justify-center'>
                      {taxonomy.featured === true ? (
                        <Star className='h-5 w-5 text-yellow-500 fill-yellow-500' />
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {taxonomy.parentLabel && (
                      <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                        <span>{taxonomy.parentLabel}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button variant='ghost' size='sm' asChild>
                      <NextLink
                        href={`/admin/taxonomies/service/${
                          taxonomy.level === 'category'
                            ? 'categories'
                            : taxonomy.level === 'subcategory'
                              ? 'subcategories'
                              : 'subdivisions'
                        }/${taxonomy.id}`}
                      >
                        <Edit className='h-4 w-4' />
                        <span className='sr-only'>Edit</span>
                      </NextLink>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='mt-6'>
          <AdminTablePagination
            currentPage={page}
            totalPages={totalPages}
            currentLimit={limit}
            basePath='/admin/taxonomies/service'
          />
        </div>
      )}
    </div>
  );
}
