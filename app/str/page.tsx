"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, FormInput, Select } from "@/components";
import { formatDateNG, formatNGN } from "@/lib/localization";
import {
  getRiskColor,
  getStatusColor,
  getSTRStatusLabel,
} from "@/lib/statusColorUtils";
import { authFetch } from "@/lib/auth-client";

interface STRListItem {
  id: string;
  customerName: string;
  accountNumber: string;
  submittingFinancialInstitution: string;
  transactionAmount: number;
  status: string;
  riskClassification: string;
  submittedDate: string | null;
  createdAt: string;
}

export default function STRPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<STRListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const pageSize = 20;

  // Fetch STR submissions with filters
  useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
          ...(statusFilter !== "all" && { status: statusFilter }),
        });

        const resp = await authFetch(`/api/str?${params}`);
        const data = await resp.json();
        
        // Filter by search locally if needed
        let filtered = data.submissions || [];
        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(
            (item: STRListItem) =>
              item.customerName.toLowerCase().includes(searchLower) ||
              item.id.toLowerCase().includes(searchLower) ||
              item.accountNumber.toLowerCase().includes(searchLower)
          );
        }
        
        setSubmissions(filtered);
        setTotalSubmissions(data.total || 0);
      } catch (err) {
        console.error("Error fetching STR submissions:", err);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, [currentPage, search, statusFilter]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSTRClick = (strId: string) => {
    router.push(`/str/${strId}`);
  };

  const handleCreateSTR = () => {
    router.push("/str/create");
  };

  const totalPages = Math.ceil(totalSubmissions / pageSize);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2 text-primary m-0">Suspicious Transaction Reports</h1>
          <p className="text-text-secondary text-base mt-2">
            View, manage, and track all STR submissions
          </p>
        </div>
        <Button variant="success" onClick={handleCreateSTR}>
          + New STR
        </Button>
      </div>

      {/* Filters & Search */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Input */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-2">
                Search STR
              </label>
              <FormInput
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by STR ID, customer, or account..."
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
                  { value: "draft", label: "Draft" },
                  { value: "submitted", label: "Submitted" },
                  { value: "under_review", label: "Under Review" },
                  { value: "closed", label: "Closed" },
                ]}
                fullWidth
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              Showing <strong>{submissions.length}</strong> of{" "}
              <strong>{totalSubmissions}</strong> submissions
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

      {/* STR Table */}
      {loading ? (
        <Card>
          <p className="text-text-secondary text-center py-8">
            Loading STR submissions...
          </p>
        </Card>
      ) : submissions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-text-secondary mb-2">
              No STR submissions found.
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
                    STR ID
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Customer
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Account
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Amount
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Risk Level
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Institution
                  </th>
                  <th className="text-left text-xs font-semibold text-text-secondary p-4">
                    Submitted Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleSTRClick(item.id)}
                    className="border-b border-border hover:bg-bg-secondary cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-text-primary text-sm">
                        {item.id}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-text-primary">
                        {item.customerName}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-text-primary font-mono">
                        {item.accountNumber}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-text-primary font-semibold">
                        {formatNGN(item.transactionAmount)}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={getRiskColor(item.riskClassification)}>
                        {item.riskClassification.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={getStatusColor(item.status)}>
                        {getSTRStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-text-primary">
                        {item.submittingFinancialInstitution}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-text-primary">
                        {item.submittedDate
                          ? formatDateNG(new Date(item.submittedDate))
                          : "—"}
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
