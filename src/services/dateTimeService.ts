/**
 * Date/Time formatting utilities for consistent timestamps and date separators
 */

import { getTimeFormatPreference, TimeFormatPreference } from './uiPreferencesService';

/** Return the hour12 option based on user preference. Undefined means use locale default. */
export function getHour12Option(): boolean | undefined {
  const pref: TimeFormatPreference = getTimeFormatPreference();
  if (pref === '12h') return true;
  if (pref === '24h') return false;
  return undefined; // locale
}

/** Format a compact time string, e.g., 14:05 or 2:05 PM, honoring 12/24h preference or locale. */
export function formatTimeShort(timestamp: string | number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: getHour12Option() });
}

/** Format a human-friendly date label, e.g., "Oct 18, 2025" based on locale. */
export function formatDateLabel(timestamp: string | number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  // Use medium style which typically maps to `Mon DD, YYYY` in many locales
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  } catch {
    // Fallback for environments without dateStyle support
    return date.toLocaleDateString();
  }
}

/** Compare if two timestamps fall on the same local calendar date. */
export function isSameLocalDate(a: string | number | Date, b: string | number | Date): boolean {
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
