export interface DatasetItem {
  id: string;
  name?: string;
  label?: string;
  slug?: string;
  description?: string;
  icon?: string;
  plural?: string;
  child_count?: number;
  children?: DatasetItem[];
  [key: string]: any;
}

/**
 * Type for dataset items that are guaranteed to have a label field
 * Used when passing taxonomies from server to client components
 */
export type DatasetOption = DatasetItem & { label: string };

/**
 * Type for dataset items with both label and category fields
 * Used for skills and other categorized datasets
 */
export type DatasetWithCategory = DatasetItem & { label: string; category: string };
