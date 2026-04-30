/**
 * AML Backend API Service
 * 
 * This service defines all endpoints the backend engineer needs to implement.
 * Replace API_BASE_URL with your actual backend URL (e.g., http://localhost:3001 or https://api.aml.com)
 */

"use client";

import { authFetch } from "@/lib/auth-client";

// use same-origin API by default when running in browser; allows built-in Next.js API routes
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api');

const fetch = authFetch;

// ============================================================================
// TYPE DEFINITIONS (Match these with your backend responses)
// ============================================================================

export interface KPIResponse {
  totalTransactions: number;
  transactionsTrend: number;
  totalAlerts: number;
  alertSegmentation: {
    new: number;
    underReview: number;
    escalated: number;
    strSubmitted: number;
    closed: number;
  };
  overdueCases: number;
  slaCountdown: string; // Format: "2h 15m"
  strSubmittedToday: number;
  ruleBasedDetectionCount: number;
  pendingRegulatoryReviews: number;
}

export interface AlertResponse {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  slsRemaining: number; // in hours
  institution?: string;
  timestamp: string;
}

export interface AlertsListResponse {
  alerts: AlertResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RealTimeIndicatorsResponse {
  liveNotifications: number;
  ruleBasedDetectionCount: number;
  recentlyEscalated: number;
  approachingSLA: number;
}

export interface BankDashboardResponse {
  branchesMonitored: number;
  branchesRequiringAttention: number;
  casesUnderReview: number;
  casesPendingEscalation: number;
}

export interface RegulatorDashboardResponse {
  institutionRiskRank: number;
  strSubmissionCount: number;
  complianceTrendPercentage: number;
  isAllSubmittedOnTime: boolean;
}

export interface AdminDashboardResponse {
  systemUptime: string;
  activeUsers: number;
  dataProcessingRate: string; // e.g., "2.3M txn/hr"
  lastBackupTime: string;
}

export interface HeatmapDataResponse {
  data: Array<{
    region: string;
    riskScore: number;
  }>;
}

export interface TrendDataResponse {
  data: Array<{
    timestamp: string;
    alerts: number;
  }>;
}

export interface AlertLifecycleResponse {
  new: number;
  underReview: number;
  escalated: number;
  strSubmitted: number;
  closed: number;
}

export interface InstitutionRiskResponse {
  data: Array<{
    institution: string;
    riskScore: number;
    trend: number;
  }>;
}

export interface AdminMetricsResponse {
  activeUsers: number;
  dataProcessingRate: string; // e.g., "45 alerts/hr"
  ruleEffectiveness: string; // e.g., "87%"
  systemUptime: string; // e.g., "99.9%"
  lastBackupTime: string;
  monitoredInstitutions: number;
  totalRules: number;
  totalAlerts: number;
}

export interface FinancialInstitutionRecord {
  id: string;
  name: string;
  code: string;
  status: "verified" | "suspended";
  alertsThisMonth: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  strSubmissions: number;
  averageReviewTime: number;
  complianceStatus: "compliant" | "warning" | "non_compliant";
}

export interface FinancialInstitutionsResponse {
  financialInstitutions: FinancialInstitutionRecord[];
}

export interface STRComplianceResponse {
  summary: {
    totalSubmissions: number;
    submitted: number;
    pending: number;
    approved: number;
    rejected: number;
    complianceRate: string; // e.g., "92%"
  };
  institutionStats: Array<{
    institution: string;
    riskScore: number;
    alertCount: number;
  }>;
  complianceTrends: Array<{
    date: string;
    PENDING?: number;
    SUBMITTED?: number;
    APPROVED?: number;
    REJECTED?: number;
  }>;
}

export interface STRSubmissionRecord {
  id: string;
  transactionSummary: string;
  customerName: string;
  accountNumber: string;
  descriptionOfSuspicion: string;
  rulesTriggered: string[];
  narrative: string;
  riskClassification: "critical" | "high" | "medium" | "low";
  status: "draft" | "submitted" | "under_review" | "closed";
  caseNumber: string | null;
  submittedBy: string;
  submittingFinancialInstitution: string;
  transactionAmount: number;
  submittedDate: string | null;
  createdAt: string;
}

export interface STRSubmissionsResponse {
  submissions: STRSubmissionRecord[];
  total: number;
  page: number;
  pageSize: number;
}

// case management types
export interface CaseRecord {
  id: string;
  linkedAlerts: string[];
  customer: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  investigator?: string;
  status: 'new' | 'underReview' | 'escalated' | 'strSubmitted' | 'closed';
  escalationLevel: number;
  complianceDeadline: string;
  slaRemainingHours: number;
  overdue: boolean;
}

export interface CaseDiscussionResponse {
  entries: Array<{ user: string; message: string; timestamp: string }>;
}

export interface CaseAuditResponse {
  timeline: Array<{ event: string; user: string; timestamp: string; ip?: string }>;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const amlAPI = {
  /**
   * Fetch KPI summary data
   * GET /api/kpi/summary
   * Required query params: none
   */
  getKPISummary: async (): Promise<KPIResponse> => {
    const response = await fetch(`${API_BASE_URL}/kpi/summary`);
    if (!response.ok) throw new Error('Failed to fetch KPI summary');
    return response.json();
  },

  /**
   * Fetch top high-risk alerts
   * GET /api/alerts/top?limit=5&severity=all
   * Required query params: limit (default: 5), severity (default: 'all')
   */
  getTopAlerts: async (limit: number = 5, severity: string = 'all'): Promise<AlertsListResponse> => {
    const params = new URLSearchParams({ limit: limit.toString(), severity });
    const response = await fetch(`${API_BASE_URL}/alerts/top?${params}`);
    if (!response.ok) throw new Error('Failed to fetch top alerts');
    return response.json();
  },

  /**
   * Fetch all alerts with pagination and filtering
   * GET /api/alerts?page=1&pageSize=20&severity=all&sortBy=slsRemaining
   * Required query params: page, pageSize, severity, sortBy
   */
  // fetch alerts with optional filtering
  getAlerts: async (
    page: number = 1,
    pageSize: number = 20,
    filters: {
      severity?: string;
      lifecycleStage?: string;
      institution?: string;
      dateFrom?: string;
      dateTo?: string;
      amountMin?: string;
      amountMax?: string;
    } = {}
  ): Promise<AlertsListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy: 'slsRemaining',
    });
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, v);
    });
    const response = await fetch(`${API_BASE_URL}/alerts?${params}`);
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return response.json();
  },

  /**
   * update lifecycle status for a specific alert
   * PATCH /api/alerts/:id
   * body: { lifecycleStage: string }
   */
  updateAlertLifecycle: async (id: string, lifecycleStage: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/alerts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycleStage }),
    });
    if (!response.ok) throw new Error("Failed to update alert");
  },

  /**
   * Fetch case by ID
   * GET /api/cases/:id
   */
  getCase: async (id: string): Promise<CaseRecord> => {
    const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Failed to fetch case');
    return response.json();
  },

  /**
   * Update case status
   * PATCH /api/cases/:id
   */
  updateCaseStatus: async (id: string, status: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update case');
  },

  /**
   * Escalate case to regulator (e.g. send for review / create regulator ticket)
   * PATCH /api/cases/:id/escalate
   */
  escalateCaseToRegulator: async (id: string, reason?: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(id)}/escalate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to escalate case');
  },

  /**
   * Discussion entries
   */
  postCaseDiscussion: async (id: string, message: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(id)}/discussion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error('Failed to post discussion');
  },
  getCaseDiscussion: async (id: string): Promise<CaseDiscussionResponse> => {
    const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(id)}/discussion`);
    if (!response.ok) throw new Error('Failed to fetch discussion');
    return response.json();
  },

  getCaseAudit: async (id: string): Promise<CaseAuditResponse> => {
    const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(id)}/audit`);
    if (!response.ok) throw new Error('Failed to fetch audit timeline');
    return response.json();
  },

  /**
   * Fetch real-time indicators
   * GET /api/indicators/realtime
   */
  getRealTimeIndicators: async (): Promise<RealTimeIndicatorsResponse> => {
    const response = await fetch(`${API_BASE_URL}/indicators/realtime`);
    if (!response.ok) throw new Error('Failed to fetch real-time indicators');
    return response.json();
  },

  /**
   * Fetch bank-specific dashboard data
   * GET /api/dashboard/bank
   */
  getBankDashboard: async (): Promise<BankDashboardResponse> => {
    const response = await fetch(`${API_BASE_URL}/dashboard/bank`);
    if (!response.ok) throw new Error('Failed to fetch bank dashboard');
    return response.json();
  },

  /**
   * Fetch regulator-specific dashboard data
   * GET /api/dashboard/regulator
   */
  getRegulatorDashboard: async (): Promise<RegulatorDashboardResponse> => {
    const response = await fetch(`${API_BASE_URL}/dashboard/regulator`);
    if (!response.ok) throw new Error('Failed to fetch regulator dashboard');
    return response.json();
  },

  /**
   * Fetch admin-specific dashboard data
   * GET /api/dashboard/admin
   */
  getAdminDashboard: async (): Promise<AdminDashboardResponse> => {
    const response = await fetch(`${API_BASE_URL}/dashboard/admin`);
    if (!response.ok) throw new Error('Failed to fetch admin dashboard');
    return response.json();
  },

  /**
   * Fetch national risk heatmap data
   * GET /api/analytics/heatmap
   */
  getHeatmapData: async (): Promise<HeatmapDataResponse> => {
    const response = await fetch(`${API_BASE_URL}/analytics/heatmap`);
    if (!response.ok) throw new Error('Failed to fetch heatmap data');
    return response.json();
  },

  /**
   * Fetch suspicious activity trend data
   * GET /api/analytics/trends?timeRange=24h
   * Required query params: timeRange (24h, 7d, 30d, 90d)
   */
  getTrendData: async (timeRange: string = '24h'): Promise<TrendDataResponse> => {
    const params = new URLSearchParams({ timeRange });
    const response = await fetch(`${API_BASE_URL}/analytics/trends?${params}`);
    if (!response.ok) throw new Error('Failed to fetch trend data');
    return response.json();
  },

  /**
   * Fetch alert lifecycle distribution
   * GET /api/analytics/alert-lifecycle
   */
  getAlertLifecycle: async (): Promise<AlertLifecycleResponse> => {
    const response = await fetch(`${API_BASE_URL}/analytics/alert-lifecycle`);
    if (!response.ok) throw new Error('Failed to fetch alert lifecycle');
    return response.json();
  },

  /**
   * Fetch institution risk ranking
   * GET /api/analytics/institution-risk
   */
  getInstitutionRisk: async (): Promise<InstitutionRiskResponse> => {
    const response = await fetch(`${API_BASE_URL}/analytics/institution-risk`);
    if (!response.ok) throw new Error('Failed to fetch institution risk');
    return response.json();
  },

  /**
   * Fetch admin system metrics
   * GET /api/analytics/admin-metrics
   */
  getAdminMetrics: async (): Promise<AdminMetricsResponse> => {
    const response = await fetch(`${API_BASE_URL}/analytics/admin-metrics`);
    if (!response.ok) throw new Error('Failed to fetch admin metrics');
    return response.json();
  },

  /**
   * Fetch financial institutions for admin/regulator views
   * GET /api/financial-institutions
   */
  getFinancialInstitutions: async (): Promise<FinancialInstitutionsResponse> => {
    const response = await fetch(`${API_BASE_URL}/financial-institutions`);
    if (!response.ok) throw new Error('Failed to fetch financial institutions');
    return response.json();
  },

  /**
   * Fetch STR compliance analytics
   * GET /api/analytics/str-compliance
   */
  getSTRCompliance: async (): Promise<STRComplianceResponse> => {
    const response = await fetch(`${API_BASE_URL}/analytics/str-compliance`);
    if (!response.ok) throw new Error('Failed to fetch STR compliance');
    return response.json();
  },

  /**
   * Fetch STR submissions for regulator review
   * GET /api/str?page=1&pageSize=20&status=submitted
   */
  getSTRSubmissions: async (
    page: number = 1,
    pageSize: number = 20,
    status?: string
  ): Promise<STRSubmissionsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (status) params.set("status", status);
    const response = await fetch(`${API_BASE_URL}/str?${params}`);
    if (!response.ok) throw new Error("Failed to fetch STR submissions");
    return response.json();
  },

  /**
   * Export report
   * POST /api/reports/export
   * Body: { format: 'pdf' | 'csv' | 'xlsx', filters?: object }
   */
  exportReport: async (format: 'pdf' | 'csv' | 'xlsx', filters?: object): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/reports/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, filters }),
    });
    if (!response.ok) throw new Error('Failed to export report');
    return response.blob();
  },

  /**
   * Fetch transactions with optional filtering
   * GET /api/transactions?limit=50&offset=0&status=FLAGGED&search=jane
   * Query params: limit (default: 50), offset (default: 0), status (optional), search (optional)
   */
  getTransactions: async (
    limit: number = 50,
    offset: number = 0,
    status?: string,
    search?: string
  ): Promise<TransactionsResponse> => {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const response = await fetch(`${API_BASE_URL}/transactions?${params}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },
};

// Transaction types for API responses
export interface TransactionData {
  id: string;
  transactionRef: string;
  customerName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  transactionType: string;
  country: string;
  riskScore: number;
  status: string;
  flagReason?: string;
  date: string;
  institutionId: string;
  institution: {
    id: string;
    name: string;
    code: string;
  };
}

export interface TransactionsResponse {
  transactions: TransactionData[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// CUSTOM HOOKS FOR DATA FETCHING
// ============================================================================

import { useState, useEffect, useCallback, useRef, type DependencyList } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic hook for async data fetching with loading and error states
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true,
  deps: DependencyList = [],
): UseAsyncState<T> & { refetch: () => Promise<void> } {
  const asyncFunctionRef = useRef(asyncFunction);
  const depsKey = JSON.stringify(deps);
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
  }, [asyncFunction]);

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await asyncFunctionRef.current();
      setState({ data: response, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }, []);

  useEffect(() => {
    if (!immediate) return;

    const timeoutId = setTimeout(() => {
      void execute();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [immediate, execute, depsKey]);

  return {
    ...state,
    refetch: execute,
  };
}
