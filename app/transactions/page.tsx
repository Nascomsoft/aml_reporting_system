"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, Button, FormInput, Select, Badge } from "@/components";

interface Transaction {
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

interface TransactionResponse {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export default function TransactionsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 20;
  const offset = (page - 1) * limit;

  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    fetchTransactions();
  }, [session, search, statusFilter, page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");

      const data: TransactionResponse = await response.json();
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "FLAGGED":
        return "bg-red-600 text-white";
      case "UNDER_REVIEW":
        return "bg-amber-500 text-white";
      case "CLEARED":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getRiskScoreBadgeColor = (score: number) => {
    if (score >= 75) return "bg-red-600 text-white";
    if (score >= 50) return "bg-orange-600 text-white";
    if (score >= 25) return "bg-yellow-500 text-white";
    return "bg-green-600 text-white";
  };

  const tableColumns = [
    { header: "Ref", accessor: "transactionRef", width: "10%" },
    { header: "Customer", accessor: "customerName", width: "15%" },
    { header: "Account", accessor: "accountNumber", width: "12%" },
    { header: "Amount", accessor: "amount", width: "12%", format: (v: number) => `₦${v.toLocaleString()}` },
    { header: "Type", accessor: "transactionType", width: "10%" },
    { header: "Country", accessor: "country", width: "10%" },
    {
      header: "Risk Score",
      accessor: "riskScore",
      width: "12%",
      format: (v: number) => (
        <span className={`px-2 py-1 rounded text-sm font-medium ${getRiskScoreBadgeColor(v)}`}>
          {v}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      width: "12%",
      format: (v: string) => (
        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusBadgeColor(v)}`}>
          {v}
        </span>
      ),
    },
  ];

  // Add institution column for admins and regulators
  if (session?.user?.role !== "compliance_officer") {
    tableColumns.splice(4, 0, { header: "Institution", accessor: "institution.name", width: "12%" });
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Transactions</h1>
        <p className="text-gray-600">View all {session?.user?.role === "compliance_officer" ? "your institution's" : "system"} transactions</p>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormInput
            label="Search"
            placeholder="Customer/Account/Ref..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="NORMAL">Normal</option>
            <option value="FLAGGED">Flagged</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CLEARED">Cleared</option>
          </Select>
          <div className="flex items-end">
            <Button onClick={() => fetchTransactions()} className="w-full" variant="secondary">
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="bg-red-50 border border-red-200 mb-6">
          <p className="text-red-800">Error: {error}</p>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {transactions.length > 0 ? offset + 1 : 0} to {Math.min(offset + limit, total)} of {total} transactions
          </div>
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages || 1}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {tableColumns.map((col) => (
                      <th key={col.header} style={{ width: col.width }} className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {tableColumns.map((col) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const value = col.accessor.split(".").reduce((obj: any, key) => obj?.[key], tx);
                        return (
                          <td key={`${tx.id}-${col.header}`} style={{ width: col.width }} className="px-6 py-4 text-sm text-white">
                            {col.format ? col.format(value) : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
              <Button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                variant="secondary"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </Button>

              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      p === page ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                variant="secondary"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
