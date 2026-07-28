/**
 * DATE UTILITIES
 * Date formatting and manipulation functions
 */

import { format, formatDistance, formatRelative, isValid, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

/**
 * Format date for display in Greek locale
 */
export function formatDate(
  date: Date | string | number,
  formatStr: string = 'dd/MM/yyyy'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(dateObj)) {
    return 'Invalid Date';
  }
  
  return format(dateObj, formatStr, { locale: el });
}

/**
 * Format datetime for display
 */
export function formatDateTime(
  date: Date | string | number,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
  return formatDate(date, formatStr);
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | string | number,
  formatStr: string = 'HH:mm'
): string {
  return formatDate(date, formatStr);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(dateObj)) {
    return 'Invalid Date';
  }
  
  return formatDistance(dateObj, new Date(), { 
    addSuffix: true,
    locale: el 
  });
}

/**
 * Format relative time in context (e.g., "yesterday at 3:20 PM")
 */
export function formatRelativeDateTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(dateObj)) {
    return 'Invalid Date';
  }
  
  return formatRelative(dateObj, new Date(), { locale: el });
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const today = new Date();
  
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if date is this week
 */
export function isThisWeek(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return dateObj >= startOfWeek && dateObj <= endOfWeek;
}

/**
 * Get time ago in words
 * Matches legacy Greek grammar rules from timeago.js (singular/plural forms)
 */
export function getTimeAgo(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  // Just now
  if (diffInSeconds < 60) return 'Μόλις τώρα';

  // Minutes: "1 λεπτό πριν" vs "X λεπτά πριν"
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return minutes === 1 ? '1 λεπτό πριν' : `${minutes} λεπτά πριν`;
  }

  // Hours: "1 ώρα πριν" vs "X ώρες πριν"
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return hours === 1 ? '1 ώρα πριν' : `${hours} ώρες πριν`;
  }

  // Days: "1 ημέρα πριν" vs "X ημέρες πριν"
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return days === 1 ? '1 ημέρα πριν' : `${days} ημέρες πριν`;
  }

  // Months: "1 μήνα πριν" vs "X μήνες πριν"
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return months === 1 ? '1 μήνα πριν' : `${months} μήνες πριν`;
  }

  // Years: "1 χρόνο πριν" vs "X χρόνια πριν"
  const years = Math.floor(diffInSeconds / 31536000);
  return years === 1 ? '1 χρόνο πριν' : `${years} χρόνια πριν`;
}

/**
 * Format duration in minutes/hours
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} λεπτά`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) return `${hours} ώρες`;
  
  return `${hours} ώρες ${remainingMinutes} λεπτά`;
}

/**
 * Calculate years of experience from start date
 */
export function calculateYearsOfExperience(startDate: Date | string): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const now = new Date();
  
  return Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Format date range
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  formatStr: string = 'dd/MM/yyyy'
): string {
  return `${formatDate(startDate, formatStr)} - ${formatDate(endDate, formatStr)}`;
}

/**
 * Get local ISO string (for datetime-local inputs)
 */
export function getLocalISOString(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
}