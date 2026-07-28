import type { ColumnDef } from '@/components/admin/admin-data-table';
import { NextLink } from '@/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageIcon, Edit, FileImage, Star } from 'lucide-react';

/**
 * Reusable column renderers for admin data tables
 * Eliminates duplication across 11 data table files
 * Compatible with custom AdminDataTable component
 */

interface IdRow {
  id: string | number;
}

interface LabelRow extends IdRow {
  [key: string]: any;
}

export const columnRenderers = {
  /**
   * Standard ID column with monospace styling
   */
  id<T extends IdRow>(): ColumnDef<T> {
    return {
      key: 'id',
      header: 'ID',
      sortable: true,
      className: 'w-[80px]',
      render: (row) => (
        <span className='font-mono text-xs text-muted-foreground'>
          {row.id}
        </span>
      ),
    };
  },

  /**
   * Clickable label column linking to edit page
   * @param editBasePath - Base path for edit links (e.g., '/admin/taxonomies/tags')
   * @param labelKey - Key to access label value (default: 'label')
   */
  label<T extends LabelRow>(
    editBasePath: string,
    labelKey = 'label',
  ): ColumnDef<T> {
    return {
      key: labelKey,
      header: 'Label',
      sortable: true,
      className: 'min-w-[250px]',
      render: (row) => {
        const label = row[labelKey] as string;
        return (
          <NextLink
            href={`${editBasePath}/${row.id}`}
            className='font-medium hover:text-primary hover:underline transition-colors'
          >
            {label}
          </NextLink>
        );
      },
    };
  },

  /**
   * Monospace slug display
   * @param slugKey - Key to access slug value (default: 'slug')
   */
  slug<T extends Record<string, any>>(slugKey = 'slug'): ColumnDef<T> {
    return {
      key: slugKey,
      header: 'Slug',
      sortable: true,
      className: 'min-w-[220px]',
      render: (row) => (
        <span className='font-mono text-sm text-muted-foreground'>
          {row[slugKey] as string}
        </span>
      ),
    };
  },

  /**
   * Empty image placeholder with icon (small)
   */
  imagePlaceholder<T>(): ColumnDef<T> {
    return {
      key: 'image',
      header: 'Image',
      className: 'w-[80px]',
      render: () => (
        <div className='flex h-10 w-10 items-center justify-center rounded-md border border-dashed'>
          <ImageIcon className='h-5 w-5 text-muted-foreground' />
        </div>
      ),
    };
  },

  /**
   * Empty image placeholder with icon (larger gray box)
   */
  imagePlaceholderAlt<T>(): ColumnDef<T> {
    return {
      key: 'image',
      header: 'Image',
      className: 'w-[80px]',
      render: () => (
        <div className='w-16 h-12 bg-gray-100 rounded flex items-center justify-center'>
          <FileImage className='w-6 h-6 text-gray-400' />
        </div>
      ),
    };
  },

  /**
   * Edit button action column (icon-only)
   * @param editBasePath - Base path for edit links
   */
  actionsIcon<T extends IdRow>(editBasePath: string): ColumnDef<T> {
    return {
      key: 'actions',
      header: 'Actions',
      className: 'w-[100px]',
      render: (row) => (
        <Button size='icon' variant='ghost' asChild>
          <NextLink href={`${editBasePath}/${row.id}`}>
            <Edit className='h-4 w-4' />
          </NextLink>
        </Button>
      ),
    };
  },

  /**
   * Edit button action column (with text)
   * @param editBasePath - Base path for edit links
   * @param size - Button size (default: 'sm')
   */
  actionsButton<T extends IdRow>(
    editBasePath: string,
    size: 'sm' | 'md' | 'lg' = 'sm',
  ): ColumnDef<T> {
    return {
      key: 'actions',
      header: 'Actions',
      className: 'w-[120px]',
      render: (row) => (
        <Button variant='ghost' size={size} asChild>
          <NextLink href={`${editBasePath}/${row.id}`}>
            <Edit className='h-4 w-4' />
            Edit
          </NextLink>
        </Button>
      ),
    };
  },

  /**
   * Configurable badge display
   * @param key - Key to access badge value
   * @param header - Column header text
   * @param variant - Badge variant (default: 'secondary')
   */
  badge<T extends Record<string, any>>(
    key: string,
    header: string,
    variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary',
  ): ColumnDef<T> {
    return {
      key,
      header,
      sortable: true,
      render: (row) => {
        const value = row[key];
        if (!value) return <span className='text-muted-foreground'>—</span>;
        return <Badge variant={variant}>{value as string}</Badge>;
      },
    };
  },

  /**
   * Numeric count display
   * @param key - Key to access count value
   * @param header - Column header text
   * @param fallback - Fallback value if count is missing (default: '0')
   */
  count<T extends Record<string, any>>(
    key: string,
    header: string,
    fallback = '0',
  ): ColumnDef<T> {
    return {
      key,
      header,
      sortable: true,
      className: 'w-[120px]',
      render: (row) => {
        const value = row[key];
        return (
          <span className='font-medium'>
            {value !== undefined && value !== null ? String(value) : fallback}
          </span>
        );
      },
    };
  },

  /**
   * Text column with optional truncation
   * @param key - Key to access text value
   * @param header - Column header text
   * @param maxLength - Maximum length before truncation (optional)
   */
  text<T extends Record<string, any>>(
    key: string,
    header: string,
    maxLength?: number,
  ): ColumnDef<T> {
    return {
      key,
      header,
      sortable: true,
      render: (row) => {
        const value = row[key] as string | undefined;
        if (!value) return <span className='text-muted-foreground'>—</span>;

        if (maxLength && value.length > maxLength) {
          return (
            <span className='text-sm' title={value}>
              {value.substring(0, maxLength)}...
            </span>
          );
        }

        return <span className='text-sm'>{value}</span>;
      },
    };
  },

  /**
   * Parent category display (for hierarchical data)
   * @param parentKey - Key to access parent object (default: 'parent')
   * @param labelKey - Key to access parent label (default: 'label')
   */
  parent<T extends Record<string, any>>(
    parentKey = 'parent',
    labelKey = 'label',
  ): ColumnDef<T> {
    return {
      key: parentKey,
      header: 'Parent',
      sortable: true,
      className: 'min-w-[200px]',
      render: (row) => {
        const parent = row[parentKey];
        if (!parent) return <span className='text-muted-foreground'>—</span>;
        return <span className='text-sm'>{parent[labelKey] as string}</span>;
      },
    };
  },

  /**
   * Category lookup display with badge (for skills, tags, etc.)
   * @param categoryKey - Key to access category ID
   * @param lookupData - Array of category objects to lookup from
   * @param lookupLabelKey - Key to access category label (default: 'label')
   */
  categoryLookup<T extends Record<string, any>>(
    categoryKey: string,
    lookupData: Array<{ id: string | number; [key: string]: any }>,
    lookupLabelKey = 'label',
  ): ColumnDef<T> {
    return {
      key: categoryKey,
      header: 'Category',
      sortable: true,
      className: 'min-w-[160px]',
      render: (row) => {
        const categoryId = row[categoryKey];
        if (!categoryId)
          return <span className='text-muted-foreground'>—</span>;

        const category = lookupData.find((cat) => cat.id === categoryId);
        return category ? (
          <Badge variant='secondary'>
            {category[lookupLabelKey] as string}
          </Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        );
      },
    };
  },

  /**
   * Category lookup display with badge using a lookup map (server-side optimized)
   * @param categoryKey - Key to access category ID
   * @param lookupMap - Object mapping category IDs to labels
   */
  categoryLookupFromMap<T extends Record<string, any>>(
    categoryKey: string,
    lookupMap: Record<string, string>,
  ): ColumnDef<T> {
    return {
      key: categoryKey,
      header: 'Category',
      sortable: true,
      className: 'min-w-[160px]',
      render: (row) => {
        const categoryId = row[categoryKey];
        if (!categoryId)
          return <span className='text-muted-foreground'>—</span>;

        const categoryLabel = lookupMap[categoryId as string];
        return categoryLabel ? (
          <Badge variant='secondary'>{categoryLabel}</Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        );
      },
    };
  },

  /**
   * Featured star icon column
   * @param featuredKey - Key to access featured boolean (default: 'featured')
   */
  featured<T extends Record<string, any>>(
    featuredKey = 'featured',
  ): ColumnDef<T> {
    return {
      key: featuredKey,
      header: 'Featured',
      sortable: true,
      className: 'w-[100px]',
      render: (row) => (
        <div className='flex items-center justify-center'>
          {row[featuredKey] === true ? (
            <Star className='h-5 w-5 text-yellow-500 fill-yellow-500' />
          ) : (
            <span className='text-muted-foreground'>—</span>
          )}
        </div>
      ),
    };
  },
};
