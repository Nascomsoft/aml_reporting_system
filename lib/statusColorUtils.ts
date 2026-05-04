/**
 * Utility functions for status and severity color mapping
 * Reusable across case management, STR, and other pages
 */

export const getRiskColor = (riskLevel: string | undefined | null): "danger" | "warning" | "primary" | "success" => {
  if (!riskLevel) return "primary";
  
  switch (riskLevel.toLowerCase()) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "primary";
    case "low":
      return "success";
    default:
      return "primary";
  }
};

export const getStatusColor = (status: string | undefined | null): "danger" | "warning" | "primary" | "success" => {
  if (!status) return "primary";
  
  switch (status.toLowerCase()) {
    case "new":
      return "primary";
    case "underreview":
      return "warning";
    case "under_review":
      return "warning";
    case "escalated":
      return "danger";
    case "strsubmitted":
      return "success";
    case "submitted":
      return "success";
    case "draft":
      return "primary";
    case "closed":
      return "primary";
    case "accepted":
      return "success";
    case "rejected":
      return "danger";
    case "in_review":
      return "warning";
    default:
      return "primary";
  }
};

export const formatStatusDisplay = (status: string | undefined | null): string => {
  if (!status) return "";
  
  return status
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Map STR status to readable display text
 */
export const getSTRStatusLabel = (status: string | undefined | null): string => {
  const statusMap: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    accepted: "Accepted",
    rejected: "Rejected",
    closed: "Closed",
  };
  return statusMap[status?.toLowerCase() ?? ""] || formatStatusDisplay(status);
};

/**
 * Get severity/risk level label
 */
export const getSeverityLabel = (severity: string | undefined | null): string => {
  const severityMap: Record<string, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return severityMap[severity?.toLowerCase() ?? ""] || formatStatusDisplay(severity);
};
