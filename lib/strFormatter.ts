/**
 * STR-specific formatting utilities
 * Formats transaction details, amounts, and other STR-related data
 */

import { formatNGN, formatDateNG, formatDateTimeNG } from "./localization";

export interface TransactionDetail {
  id: string;
  amount: number;
  currency: string;
  date?: string | null;
  origin: string;
  destination: string;
}

/**
 * Format transaction amount based on currency
 */
export const formatTransactionAmount = (amount: number, currency: string = "NGN"): string => {
  if (currency.toUpperCase() === "NGN") {
    return formatNGN(amount);
  }
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format a list of transactions with their amounts
 */
export const formatTransactionsList = (transactions: TransactionDetail[]): string => {
  return transactions
    .map(
      (t) =>
        `${formatTransactionAmount(t.amount, t.currency)} - ${t.origin} → ${t.destination}`
    )
    .join("; ");
};

/**
 * Format submission date/time for display
 */
export const formatSubmissionDate = (dateString?: string | null): string => {
  if (!dateString) return "N/A";
  return formatDateTimeNG(dateString);
};

/**
 * Format STR ID for display
 */
export const formatSTRId = (id: string): string => {
  return id.toUpperCase();
};

/**
 * Get severity badge text with icon
 */
export const getSeverityBadgeText = (severity: string): string => {
  const severityMap: Record<string, string> = {
    critical: "🔴 Critical",
    high: "🟠 High",
    medium: "🟡 Medium",
    low: "🟢 Low",
  };
  return severityMap[severity?.toLowerCase() ?? ""] || severity;
};

/**
 * Calculate total transaction amount from list
 */
export const calculateTotalTransactionAmount = (transactions: TransactionDetail[]): number => {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
};
