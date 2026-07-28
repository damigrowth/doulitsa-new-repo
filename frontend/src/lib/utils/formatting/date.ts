import { format } from 'date-fns';

/**
 * Formats a given date string to a specified format.
 * @param dateStr - The date string to format.
 * @param formatType - The format string (e.g., 'dd MMMM yyyy').
 * @returns An object containing the formatted date string.
 */
export const formatDate = (dateStr: string | Date, formatType: string): { formattedDate: string } => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const formattedDate = format(date, formatType);

  return { formattedDate };
};