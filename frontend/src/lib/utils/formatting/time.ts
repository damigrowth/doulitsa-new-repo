import { format, register } from 'timeago.js';

// Define the locale function type
type LocaleFunc = (number: number, index: number) => [string, string];

// Greek locale configuration
const greekLocale: LocaleFunc = (number: number, index: number) => {
  const locales: [string, string][] = [
    ['μόλις τώρα', 'σε λίγο'],
    ['πριν %s δευτερόλεπτα', 'σε %s δευτερόλεπτα'],
    ['πριν 1 λεπτό', 'σε 1 λεπτό'],
    ['πριν %s λεπτά', 'σε %s λεπτά'],
    ['πριν 1 ώρα', 'σε 1 ώρα'],
    ['πριν %s ώρες', 'σε %s ώρες'],
    ['πριν 1 ημέρα', 'σε 1 ημέρα'],
    ['πριν %s ημέρες', 'σε %s ημέρες'],
    ['πριν 1 εβδομάδα', 'σε 1 εβδομάδα'],
    ['πριν %s εβδομάδες', 'σε %s εβδομάδες'],
    ['πριν 1 μήνα', 'σε 1 μήνα'],
    ['πριν %s μήνες', 'σε %s μήνες'],
    ['πριν 1 χρόνο', 'σε 1 χρόνο'],
    ['πριν %s χρόνια', 'σε %s χρόνια'],
  ];
  return locales[index];
};

// Register Greek locale
register('el', greekLocale);

/**
 * Formats a date to relative time in Greek
 * @param date - The date to format
 * @returns Formatted relative time string in Greek
 */
export const timeAgo = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '';

    return format(dateObj, 'el');
  } catch (error) {
    console.error('Error formatting Greek time:', error);
    return '';
  }
};

/**
 * Gets only the date part from a date string for comparison purposes
 * @param dateString - ISO date string
 * @returns Date in YYYY-MM-DD format for easy comparison
 */
export const getDatePart = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  } catch (error) {
    return '';
  }
};

/**
 * Formats a date string to display time only (HH:MM format)
 * @param dateString - ISO date string to format
 * @returns Formatted time in HH:MM format
 */
export const formatMessageTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const messageDate = new Date(dateString);

    if (isNaN(messageDate.getTime())) {
      return '';
    }

    // Get hours and minutes
    const hours = messageDate.getHours();
    const minutes = messageDate.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
};

/**
 * Formats a date string to display in compact format:
 * - Today: HH:MM
 * - This year: DD/M
 * - Previous years: DD/MM/YYYY
 *
 * @param dateString - ISO date string to format
 * @returns Formatted date in compact format
 */
export const formatCompactMessageTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const messageDate = new Date(dateString);

    if (isNaN(messageDate.getTime())) return '';

    // Get hours and minutes
    const hours = messageDate.getHours();
    const minutes = messageDate.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const today = new Date();

    // Check if the message is from today
    const isToday =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();

    // Check if the message is from the current year
    const isThisYear = messageDate.getFullYear() === today.getFullYear();

    if (isToday) {
      // For today's messages, just show the time
      return timeStr;
    } else if (isThisYear) {
      // For messages from this year, show day and month in compact format DD/M
      const day = messageDate.getDate();
      const month = messageDate.getMonth() + 1;

      return `${day}/${month}`;
    } else {
      // For messages from previous years, show day/month/year
      const day = messageDate.getDate().toString().padStart(2, '0');
      const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
      const year = messageDate.getFullYear();

      return `${day}/${month}/${year}`;
    }
  } catch (error) {
    return '';
  }
};