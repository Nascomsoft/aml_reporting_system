/**
 * Nigerian Localization Utilities
 * Provides formatting for currency (NGN), dates, and locale-specific helpers
 */

/**
 * Format a number as Nigerian Naira (₦)
 * @param amount - The amount to format
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "₦1,234,567.89")
 */
export function formatNGN(
  amount: number,
  decimalPlaces: number = 2
): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount);
}

/**
 * Format a date as DD/MM/YYYY (Nigerian standard)
 * @param date - The date to format (Date object or ISO string)
 * @returns Formatted string (e.g., "27/03/2026")
 */
export function formatDateNG(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a date and time as DD/MM/YYYY HH:MM (Nigerian standard)
 * @param date - The date to format
 * @returns Formatted string (e.g., "27/03/2026 14:30")
 */
export function formatDateTimeNG(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Parse a DD/MM/YYYY date string to a Date object
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Date object or null if invalid
 */
export function parseDateNG(dateStr: string): Date | null {
  const [day, month, year] = dateStr.split('/').map(Number);

  if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return date;
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - The date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDateNG(dateObj);
}

/**
 * Get timezone info for Nigeria (WAT - West Africa Time)
 * @returns Timezone offset and name
 */
export function getNigerianTimezone(): { offset: number; name: string } {
  return {
    offset: 1, // UTC+1
    name: 'WAT (West Africa Time)',
  };
}

/**
 * Common Nigerian institution names and codes
 */
export const NIGERIAN_INSTITUTIONS = [
  { code: 'GTB', name: 'Harbor Crest Bank (GTB)' },
  { code: 'ACCESS', name: 'Summit Gate Bank' },
  { code: 'ZENITH', name: 'Crown Meridian Bank' },
  { code: 'FIRST', name: 'Heritage Union Bank' },
  { code: 'DIAMOND', name: 'Diamond Ridge Bank' },
  { code: 'UNION', name: 'Union Crest Bank' },
  { code: 'STANBIC', name: 'Capital Spring Bank' },
  { code: 'FCMB', name: 'First City Heritage Bank' },
  { code: 'UBA', name: 'Continental Trust Bank (UBA)' },
  { code: 'WEMA', name: 'Wema Crest Bank' },
];

/**
 * CBN AML Risk Categories
 */
export const AML_RISK_LEVELS = [
  { value: 'low', label: 'Low Risk', color: 'success' },
  { value: 'medium', label: 'Medium Risk', color: 'warning' },
  { value: 'high', label: 'High Risk', color: 'warning' },
  { value: 'critical', label: 'Critical Risk', color: 'danger' },
];

/**
 * Case lifecycle stages (CBN compliant)
 */
export const CASE_LIFECYCLE_STAGES = [
  { value: 'new', label: 'New' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'str_prepared', label: 'STR Prepared' },
  { value: 'str_submitted', label: 'STR Submitted' },
  { value: 'closed', label: 'Closed' },
];

/**
 * Detection labels for AML alerts
 */
export const DETECTION_SOURCES = [
  { value: 'core', label: 'Core (Rule-based)' },
];

/**
 * Format a number with commas (Nigerian style: 1,234,567)
 */
export function formatNumberNG(num: number | string): string {
  return new Intl.NumberFormat('en-NG').format(Number(num));
}

/**
 * Format large numbers in short form (e.g., 1.2M, 500K)
 */
export function formatNumberShort(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return String(num);
}
