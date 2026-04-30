"use client";

import React, { useState } from "react";
import {
  Card,
  Badge,
  Button,
  FormInput,
  Select,
  Table,
  Modal,
  AlertBanner,
  KPICard,
} from "@/components";
import { formatDateNG, formatDateTimeNG, formatNGN } from "@/lib/localization";
import {
  amlAPI,
  useAsync,
  FinancialInstitutionsResponse,
  STRComplianceResponse,
  STRSubmissionsResponse,
} from "@/AML_frontend/services/api";

// Types
interface STRSubmission {
  id: string;
  submittedBy: string;
  submittingFinancialInstitution: string;
  submissionDate: string;
  transactionAmount: number;
  status: "pending" | "approved" | "rejected" | "under_review";
  suspicionLevel: "low" | "medium" | "high" | "critical";
  reviewedBy?: string;
  reviewDate?: string;
  notes?: string;
}

interface InstitutionRiskMetric {
  financialInstitution: string;
  code: string;
  riskScore: number;
  strSubmissions: number;
  averageReviewTime: number;
  complianceStatus: "compliant" | "warning" | "non_compliant";
}

interface ComplianceMetric {
  metric: string;
  target: number;
  actual: number;
  status: "on_track" | "at_risk" | "failed";
}

export default function RegulatorPage() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "overview" | "submissions" | "analytics"
  >("dashboard");

  // Fetch STR compliance analytics
  const strCompliance = useAsync<STRComplianceResponse>(() => amlAPI.getSTRCompliance());
  const financialInstitutions = useAsync<FinancialInstitutionsResponse>(() =>
    amlAPI.getFinancialInstitutions()
  );
  const strSubmissionFeed = useAsync<STRSubmissionsResponse>(() =>
    amlAPI.getSTRSubmissions(1, 50)
  );
  const [submissionOverrides, setSubmissionOverrides] = useState<
    Record<string, Partial<STRSubmission>>
  >({});

  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetric[]>(
    [
      {
        metric: "STR Processing (72h target)",
        target: 100,
        actual: 78,
        status: "on_track",
      },
      {
        metric: "Submission Completeness",
        target: 100,
        actual: 95,
        status: "on_track",
      },
      {
        metric: "FIU Reporting (10-day SLA)",
        target: 100,
        actual: 100,
        status: "on_track",
      },
      {
        metric: "Document Retention",
        target: 100,
        actual: 100,
        status: "on_track",
      },
    ]
  );

  const [filterStatus, setFilterStatus] = useState("all");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<STRSubmission | null>(
    null
  );
  const [approvalNotes, setApprovalNotes] = useState("");

  const submissions: STRSubmission[] =
    strSubmissionFeed.data?.submissions.map((submission) => ({
      id: submission.id,
      submittedBy: submission.submittedBy,
      submittingFinancialInstitution: submission.submittingFinancialInstitution,
      submissionDate: submission.submittedDate ?? submission.createdAt,
      transactionAmount: submission.transactionAmount,
      status:
        submissionOverrides[submission.id]?.status ??
        (submission.status === "under_review"
          ? "under_review"
          : submission.status === "closed"
          ? "approved"
          : "pending"),
      suspicionLevel:
        submissionOverrides[submission.id]?.suspicionLevel ??
        submission.riskClassification,
      reviewedBy: submissionOverrides[submission.id]?.reviewedBy,
      reviewDate: submissionOverrides[submission.id]?.reviewDate,
      notes: submissionOverrides[submission.id]?.notes,
    })) ?? [];

  const institutionRows: InstitutionRiskMetric[] =
    financialInstitutions.data?.financialInstitutions.map((financialInstitution) => ({
      financialInstitution: financialInstitution.name,
      code: financialInstitution.code,
      riskScore: financialInstitution.riskScore,
      strSubmissions: financialInstitution.strSubmissions,
      averageReviewTime: financialInstitution.averageReviewTime,
      complianceStatus: financialInstitution.complianceStatus,
    })) ?? [];

  const filteredSubmissions =
    filterStatus === "all"
      ? submissions
      : submissions.filter((s) => s.status === filterStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "under_review":
        return "primary";
      default:
        return "primary";
    }
  };

  const getSuspicionColor = (level: string) => {
    switch (level) {
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

  const getComplianceColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "success";
      case "warning":
        return "warning";
      case "non_compliant":
        return "danger";
      default:
        return "primary";
    }
  };

  const getMetricStatus = (status: string) => {
    switch (status) {
      case "on_track":
        return "success";
      case "at_risk":
        return "warning";
      case "failed":
        return "danger";
      default:
        return "primary";
    }
  };

  const handleApproveSubmission = async () => {
    if (selectedSubmission && selectedSubmission.status === "pending") {
      setSubmissionOverrides((current) => ({
        ...current,
        [selectedSubmission.id]: {
          ...current[selectedSubmission.id],
          status: "approved",
          reviewedBy: "Zainab Hassan",
          reviewDate: formatDateNG(new Date()),
          notes: approvalNotes,
        },
      }));
      setShowApprovalModal(false);
      setApprovalNotes("");
    }
  };

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const underReviewCount = submissions.filter(
    (s) => s.status === "under_review"
  ).length;
  const totalAmount = submissions.reduce(
    (sum, s) => sum + s.transactionAmount,
    0
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="heading-2 text-primary m-0">
          Regulatory Oversight Dashboard
        </h1>
        <p className="text-text-secondary text-base mt-2">
          STR monitoring, risk analytics, and compliance reporting
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-bg-secondary">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "dashboard"
              ? "border-b-2 border-accent-600 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          📊 Analytics
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "overview"
              ? "border-b-2 border-accent-600 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          📋 Overview
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "submissions"
              ? "border-b-2 border-accent-600 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          ✉️ Submissions
        </button>
      </div>

      {/* Dashboard Tab - STR Compliance Analytics */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Compliance Metrics */}
          <div className="space-y-4">
            <h2 className="heading-3 text-primary m-0">STR Compliance Analytics</h2>
            {strCompliance.loading && <div className="text-text-secondary">Loading compliance data...</div>}
            {strCompliance.error && <AlertBanner type="danger" title="Error" message={strCompliance.error} />}
            {strCompliance.data && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                  title="Total Submissions"
                  value={strCompliance.data.summary.totalSubmissions}
                  icon="📋"
                  subtext="Lifetime"
                />
                <KPICard
                  title="Submitted"
                  value={strCompliance.data.summary.submitted}
                  icon="✓"
                  subtext="Processed"
                />
                <KPICard
                  title="Pending"
                  value={strCompliance.data.summary.pending}
                  icon="⏳"
                  subtext="Awaiting review"
                />
                <KPICard
                  title="Approved"
                  value={strCompliance.data.summary.approved}
                  icon="✅"
                  subtext="Accepted"
                />
                <KPICard
                  title="Compliance Rate"
                  value={strCompliance.data.summary.complianceRate}
                  icon="📊"
                  subtext="Effectiveness"
                />
              </div>
            )}
          </div>

          {/* Financial Institution Risk Rankings */}
          {strCompliance.data && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">Financial Institution Risk Analysis (Top 10)</h3>
              <Table
                columns={[
                  {
                    key: "institution",
                    header: "Financial Institution",
                    width: "50%",
                  },
                  {
                    key: "riskScore",
                    header: "Risk Score",
                    width: "25%",
                    render: (value) => (
                      <Badge variant={
                        (value as number) >= 75 ? "danger" :
                        (value as number) >= 50 ? "warning" : "success"
                      }>
                        {value}
                      </Badge>
                    ),
                  },
                  {
                    key: "alertCount",
                    header: "Alerts (7d)",
                    width: "25%",
                  },
                ]}
                data={strCompliance.data.institutionStats}
                rowKey="institution"
              />
            </Card>
          )}

          {/* Submission Trends */}
          {strCompliance.data && strCompliance.data.complianceTrends.length > 0 && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">Submission Trend (Last 7 Days)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bg-secondary">
                      <th className="text-left py-2 px-2 font-semibold text-text-secondary">Date</th>
                      <th className="text-center py-2 px-2 font-semibold text-text-secondary">Pending</th>
                      <th className="text-center py-2 px-2 font-semibold text-text-secondary">Submitted</th>
                      <th className="text-center py-2 px-2 font-semibold text-text-secondary">Approved</th>
                      <th className="text-center py-2 px-2 font-semibold text-text-secondary">Rejected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strCompliance.data.complianceTrends.map((trend) => (
                      <tr key={trend.date} className="border-b border-bg-secondary hover:bg-bg-secondary">
                        <td className="py-2 px-2">{trend.date}</td>
                        <td className="text-center py-2 px-2">{trend.PENDING || 0}</td>
                        <td className="text-center py-2 px-2">{trend.SUBMITTED || 0}</td>
                        <td className="text-center py-2 px-2 text-accent-600">{trend.APPROVED || 0}</td>
                        <td className="text-center py-2 px-2 text-danger-600">{trend.REJECTED || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Pending STRs"
              value={pendingCount}
              icon="⏳"
              subtext="Awaiting review"
              trend={{
                direction: "up",
                value: String(pendingCount),
                label: "requires action",
              }}
            />
            <KPICard
              title="Under Review"
              value={underReviewCount}
              icon="🔍"
              subtext="In progress"
            />
            <KPICard
              title="Approved (Month)"
              value={approvedCount}
              icon="✓"
              subtext="Processed successfully"
              trend={{
                direction: "up",
                value: "18%",
                label: "vs last month",
              }}
            />
            <KPICard
              title="Total Amount"
              value={formatNGN(totalAmount, 0).substring(0, 15)}
              icon="💰"
              subtext="Reported this month"
            />
          </div>

          {/* Critical Alerts */}
          {pendingCount > 0 && (
            <AlertBanner
              type="warning"
              title={`⏳ ${pendingCount} Pending STR${pendingCount !== 1 ? "s" : ""}`}
              message={`${pendingCount} submission${pendingCount !== 1 ? "s" : ""} awaiting regulatory review`}
              action={{
                label: "Review Now",
                onClick: () => setActiveTab("submissions"),
              }}
            />
          )}

          {/* Compliance Summary & Risk Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Compliance Metrics */}
            <div className="lg:col-span-2">
              <Card>
                <h3 className="heading-4 text-primary m-0 mb-4">
                  Compliance Metrics
                </h3>
                <div className="space-y-4">
                  {complianceMetrics.map((m, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">{m.metric}</p>
                        <Badge variant={getMetricStatus(m.status)}>
                          {m.actual}/{m.target}
                        </Badge>
                      </div>
                      <div className="w-full bg-bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            m.status === "on_track"
                              ? "bg-accent-600"
                              : m.status === "at_risk"
                              ? "bg-warning-600"
                              : "bg-danger-600"
                          }`}
                          style={{
                            width: `${Math.min((m.actual / m.target) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Risk Summary */}
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Risk Summary
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-bg-secondary rounded-lg">
                  <p className="text-xs text-text-secondary mb-1">
                    High Risk Financial Institutions
                  </p>
                  <p className="heading-4 text-danger-600">
                    {institutionRows.filter((financialInstitution) => financialInstitution.riskScore >= 80).length}
                  </p>
                </div>
                <div className="p-3 bg-bg-secondary rounded-lg">
                  <p className="text-xs text-text-secondary mb-1">
                    Average Processing Time
                  </p>
                  <p className="heading-4 text-primary">
                    {(
                      institutionRows.reduce(
                        (sum, financialInstitution) =>
                          sum + financialInstitution.averageReviewTime,
                        0
                      ) / Math.max(institutionRows.length, 1)
                    ).toFixed(1)}
                    d
                  </p>
                </div>
                <Button variant="secondary" fullWidth>
                  📄 Download Report
                </Button>
              </div>
            </Card>
          </div>

          {/* Financial Institution Risk Matrix */}
          <Card>
            <h3 className="heading-4 text-primary m-0 mb-4">
              Financial Institution Risk Assessment
            </h3>
            <div className="overflow-x-auto">
              {financialInstitutions.loading && (
                <div className="text-text-secondary">Loading financial institutions...</div>
              )}
              {financialInstitutions.error && (
                <AlertBanner
                  type="danger"
                  title="Error"
                  message={financialInstitutions.error}
                />
              )}
              {!financialInstitutions.loading && !financialInstitutions.error && (
              <Table
                columns={[
                  {
                    key: "financialInstitution",
                    header: "Financial Institution",
                    width: "25%",
                  },
                  {
                    key: "code",
                    header: "Code",
                    width: "10%",
                    render: (value) => <code className="text-xs">{value}</code>,
                  },
                  {
                    key: "riskScore",
                    header: "Risk Score",
                    width: "15%",
                    render: (value) => {
                      const num = Number(value);
                      const color =
                        num >= 80
                          ? "text-danger-600"
                          : num >= 60
                          ? "text-warning-600"
                          : "text-accent-600";
                      return <span className={`font-semibold ${color}`}>{num}/100</span>;
                    },
                  },
                  {
                    key: "strSubmissions",
                    header: "STRs",
                    width: "12%",
                    render: (value) => (
                      <span className="font-semibold">{value}</span>
                    ),
                  },
                  {
                    key: "averageReviewTime",
                    header: "Avg Review",
                    width: "15%",
                    render: (value) => (
                      <span className="text-sm">{value}d</span>
                    ),
                  },
                  {
                    key: "complianceStatus",
                    header: "Compliance",
                    width: "13%",
                    render: (value) => (
                      <Badge variant={getComplianceColor(value as string)}>
                        {(value as string).toUpperCase()}
                      </Badge>
                    ),
                  },
                ]}
                data={institutionRows}
                rowKey="code"
              />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* STR Submissions Tab */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="heading-3 text-primary m-0">STR Submissions</h2>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "pending", label: "Pending Review" },
                { value: "under_review", label: "Under Review" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
              className="min-w-40"
            />
            <span className="text-xs text-text-secondary ml-auto">
              {filteredSubmissions.length} submissions found
            </span>
          </div>

          <Card>
            {strSubmissionFeed.loading && (
              <div className="text-text-secondary">Loading submissions...</div>
            )}
            {strSubmissionFeed.error && (
              <AlertBanner
                type="danger"
                title="Error"
                message={strSubmissionFeed.error}
              />
            )}
            {!strSubmissionFeed.loading && !strSubmissionFeed.error && (
            <Table
              columns={[
                {
                  key: "id",
                  header: "STR ID",
                  width: "13%",
                  render: (value) => (
                    <code className="text-xs bg-bg-secondary px-2 py-1 rounded">
                      {value}
                    </code>
                  ),
                },
                {
                  key: "submittingFinancialInstitution",
                  header: "Financial Institution",
                  width: "18%",
                },
                {
                  key: "submittedBy",
                  header: "Submitted By",
                  width: "15%",
                  render: (value) => (
                    <span className="text-sm">{value}</span>
                  ),
                },
                {
                  key: "transactionAmount",
                  header: "Amount",
                  width: "14%",
                  render: (value) => (
                    <span className="font-semibold">
                      {formatNGN(Number(value), 0)}
                    </span>
                  ),
                },
                {
                  key: "suspicionLevel",
                  header: "Suspicion",
                  width: "12%",
                  render: (value) => (
                    <Badge variant={getSuspicionColor(value as string)}>
                      {(value as string).toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  width: "15%",
                  render: (value, row) => (
                    <Badge variant={getStatusColor(value as string)}>
                      {(value as string).replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "id",
                  header: "Action",
                  width: "13%",
                  render: (value, row) => {
                    const submission = row as STRSubmission;
                    return submission.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowApprovalModal(true);
                        }}
                      >
                        Review
                      </Button>
                    ) : (
                      <Badge variant={getStatusColor(submission.status)}>
                        ✓
                      </Badge>
                    );
                  },
                },
              ]}
              data={filteredSubmissions}
              rowKey="id"
            />
            )}
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <h2 className="heading-3 text-primary m-0">Risk Analytics</h2>

          {/* Submission Trends */}
          <Card>
            <h3 className="heading-4 text-primary m-0 mb-4">
              Submission Trends
            </h3>
            <div className="h-64 flex items-center justify-center bg-bg-secondary rounded-lg">
              <p className="text-text-secondary">
                📊 Trend chart (Data visualization module)
              </p>
            </div>
          </Card>

          {/* Risk Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Suspicion Level Distribution
              </h3>
              <div className="space-y-3">
                {["critical", "high", "medium", "low"].map((level) => {
                  const count = submissions.filter(
                    (s) => s.suspicionLevel === level
                  ).length;
                  const width = submissions.length > 0 ? (count / submissions.length) * 100 : 0;
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={getSuspicionColor(level)}>
                          {level.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            level === "critical"
                              ? "bg-danger-600"
                              : level === "high"
                              ? "bg-warning-600"
                              : level === "medium"
                              ? "bg-primary-600"
                              : "bg-accent-600"
                          }`}
                          style={{
                            width: `${width}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Status Distribution
              </h3>
              <div className="space-y-3">
                {[
                  { status: "pending", label: "Pending Review" },
                  { status: "under_review", label: "Under Review" },
                  { status: "approved", label: "Approved" },
                  { status: "rejected", label: "Rejected" },
                ].map(({ status, label }) => {
                  const count = submissions.filter(
                    (s) => s.status === status
                  ).length;
                  const width = submissions.length > 0 ? (count / submissions.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={getStatusColor(status)}>
                          {label}
                        </Badge>
                        <span className="text-xs font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            status === "approved"
                              ? "bg-accent-600"
                              : status === "pending"
                              ? "bg-warning-600"
                              : status === "rejected"
                              ? "bg-danger-600"
                              : "bg-primary-600"
                          }`}
                          style={{
                            width: `${width}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        title="Review STR Submission"
        onClose={() => setShowApprovalModal(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowApprovalModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (selectedSubmission) {
                  setSubmissionOverrides((current) => ({
                    ...current,
                    [selectedSubmission.id]: {
                      ...current[selectedSubmission.id],
                      status: "rejected",
                      reviewedBy: "Zainab Hassan",
                      reviewDate: formatDateNG(new Date()),
                    },
                  }));
                  setShowApprovalModal(false);
                }
              }}
            >
              Reject
            </Button>
            <Button variant="success" onClick={handleApproveSubmission}>
              Approve
            </Button>
          </>
        }
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <Card noPadding>
              <div className="bg-bg-secondary p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">STR ID:</span>
                  <code className="text-xs">{selectedSubmission.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Financial Institution:</span>
                  <span className="font-semibold">
                    {selectedSubmission.submittingFinancialInstitution}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Amount:</span>
                  <span className="font-semibold">
                    {formatNGN(selectedSubmission.transactionAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Suspicion:</span>
                  <Badge variant={getSuspicionColor(selectedSubmission.suspicionLevel)}>
                    {selectedSubmission.suspicionLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </Card>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Review Notes
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Document your findings and decision rationale..."
                className="input w-full"
                rows={4}
              />
            </div>

            <AlertBanner
              type="warning"
              title="Legal Certification"
              message="Your approval creates a binding regulatory record. Ensure all documentation is complete."
            />
          </div>
        )}
      </Modal>

      {/* Tab Navigation */}
      <Card className="fixed bottom-8 left-8 right-8 lg:left-auto lg:right-8 lg:w-96">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={activeTab === "overview" ? "primary" : "secondary"}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </Button>
          <Button
            size="sm"
            variant={activeTab === "submissions" ? "primary" : "secondary"}
            onClick={() => setActiveTab("submissions")}
          >
            📋 Submissions
            {pendingCount > 0 && (
              <span className="ml-2 text-xs font-bold">
                ({pendingCount})
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "analytics" ? "primary" : "secondary"}
            onClick={() => setActiveTab("analytics")}
          >
            📈 Analytics
          </Button>
        </div>
      </Card>
    </div>
  );
}
