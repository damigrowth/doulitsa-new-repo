import { format } from 'date-fns';

import { toAthensDate } from '@/lib/utils/date';

/**
 * Formats a given date string to a specified format, pinned to
 * Europe/Athens so SSR and client output are identical.
 * @param dateStr - The date string to format.
 * @param formatType - The format string (e.g., 'dd MMMM yyyy').
 * @returns An object containing the formatted date string.
 */
export const formatDate = (dateStr: string | Date, formatType: string): { formattedDate: string } => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const formattedDate = format(toAthensDate(date), formatType);

  return { formattedDate };
};