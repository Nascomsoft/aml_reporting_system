"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, FormInput, Select } from "@/components";
import { formatDateNG } from "@/lib/localization";
import { authFetch } from "@/lib/auth-client";

interface CaseListItem {
  id: string;
  caseNumber: string;
  customer: string;
  riskLevel: string;
  investigator: string | null;
  status: string;
  escalationLevel: number;
  complianceDeadline: string;
  slaRemainingHours: number;
  overdue: boolean;
  linkedAlerts: string[];
  createdAt: string;
}

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel?.toLowerCase()) {
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

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "new":
      return "primary";
    case "underreview":
      return "warning";
    case "escalated":
      return "danger";
    case "strsubmitted":
      return "success";
    case "closed":
      return "primary";
    default:
      return "primary";
  }
};

const formatStatusDisplay = (status: string) => {
  return status
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function CaseManagement() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCases, setTotalCases] = useState(0);
  const [search, setSearch] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const pageSize = 20;

  // Fetch cases with filters
  useEffect(() => {
    async function fetchCases() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(riskLevelFilter !== "all" && { riskLevel: riskLevelFilter }),
          ...(statusFilter !== "all" && { status: statusFilter }),
        });

        const resp = await authFetch(`/api/cases?${params}`);
        const data = await resp.json();
        setCases(data.cases || []);
        setTotalCases(data.total || 0);
      } catch (err) {
        console.error("Error fetching cases:", err);
        setCases([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, [currentPage, search, riskLevelFilter, statusFilter]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleRiskFilter = (value: string) => {
    setRiskLevelFilter(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleCaseClick = (caseId: string) => {
    router.push(`/case_management/${caseId}`);
  };

  const totalPages = Math.ceil(totalCases / pageSize);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="heading-2 text-primary m-0">Case Management</h1>
        <p className="text-text-secondary text-base mt-2">
          Handle investigations, manage escalations, and prepare STR submissions
        </p>
      </div>

      {/* Filters & Search */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-2">
                Search Cases
              </label>
              <FormInput
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by case number or customer..."
                fullWidth
              />
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-2">
                Risk Level
              </label>
              <Select
                placeholderDisabled={true}
                value={riskLevelFilter}
                onChange={(e) => handleRiskFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Risk Levels" },
                  { value: "critical", label: "Critical" },
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
                fullWidth
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-2">
                Status
              </label>
              <Select
                placeholderDisabled={true}
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "new", label: "New" },
                  { value: "underReview", label: "Under Review" },
                  { value: "escalated", label: "Escalated" },
                  { value: "strSubmitted", label: "STR Submitted" },
                  { value: "closed", label: "Closed" },
                ]}
                fullWidth
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              Showing <strong>{cases.length}</strong> of{" "}
              <strong>{totalCases}</strong> cases
            </span>
            {totalPages > 1 && (
              <span>
                Page <strong>{currentPage}</strong> of{" "}
                <strong>{totalPages}</strong>
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Cases Table */}
      {loading ? (
        <Card>
          <p className="text-text-secondary text-center py-8">
            Loading cases...
          </p>
        </Card>
      ) : cases.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-text-secondary mb-2">
              No cases found matching your filters.
            </p>
            <p className="text-xs text-text-tertiary">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Card>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Case Number
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Customer
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Risk Level
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Investigator
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Deadline
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    SLA
                  </th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem) => (
                  <tr
                    key={caseItem.id}
                    onClick={() => handleCaseClick(caseItem.id)}
                    className="border-b border-border hover:bg-bg-secondary cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-text-primary text-sm">
                        {caseItem.caseNumber}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-text-primary">
                        {caseItem.customer}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={getRiskColor(caseItem.riskLevel)}>
                        {caseItem.riskLevel.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={getStatusColor(caseItem.status)}>
                        {formatStatusDisplay(caseItem.status)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-text-primary">
                        {caseItem.investigator || "—"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-text-primary">
                        {formatDateNG(new Date(caseItem.complianceDeadline))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div
                        className={`text-sm font-semibold ${
                          caseItem.overdue
                            ? "text-danger-600"
                            : caseItem.slaRemainingHours < 4
                            ? "text-warning-600"
                            : "text-success-600"
                        }`}
                      >
                        {caseItem.slaRemainingHours}h
                        {caseItem.overdue && " (OVD)"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-border transition-colors text-sm font-medium"
            >
              ← Previous
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-primary text-white"
                        : "bg-bg-secondary text-text-primary hover:bg-border"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-border transition-colors text-sm font-medium"
            >
              Next →
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
