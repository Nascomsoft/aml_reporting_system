"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, FormInput, Select } from "@/components";
import { SimulationControls, type SimulationStatus } from "@/components/SimulationControls";
import { LiveTransactionStream, type StreamTransaction } from "@/components/LiveTransactionStream";
import { authFetch, authStreamUrl } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-context";

const fetch = authFetch;

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
  const { user } = useAuth();
  const router = useRouter();

  // Batch transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Real-time simulation state
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>("idle");
  const [liveTransactions, setLiveTransactions] = useState<StreamTransaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const limit = 20;
  const offset = (page - 1) * limit;

  const fetchTransactions = useCallback(async () => {
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
  }, [limit, offset, search, statusFilter]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetchTransactions();
  }, [fetchTransactions, router, user]);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Start the real-time simulation
  const handleStartSimulation = async () => {
    try {
      setSimulationLoading(true);

      // Send start command to backend
      const response = await fetch("/api/transactions/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (!response.ok) {
        throw new Error("Failed to start simulation");
      }

      setSimulationStatus("running");

      // Connect to SSE stream
      connectToSSE();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start simulation");
    } finally {
      setSimulationLoading(false);
    }
  };

  // Stop the real-time simulation
  const handleStopSimulation = async () => {
    try {
      setSimulationLoading(true);

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Send stop command to backend
      const response = await fetch("/api/transactions/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      if (!response.ok) {
        throw new Error("Failed to stop simulation");
      }

      setSimulationStatus("idle");
      setIsConnected(false);
      setLiveTransactions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop simulation");
    } finally {
      setSimulationLoading(false);
    }
  };

  // Pause the real-time simulation
  const handlePauseSimulation = async () => {
    try {
      setSimulationLoading(true);

      const response = await fetch("/api/transactions/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });

      if (!response.ok) {
        throw new Error("Failed to pause simulation");
      }

      setSimulationStatus("paused");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause simulation");
    } finally {
      setSimulationLoading(false);
    }
  };

  // Resume the real-time simulation
  const handleResumeSimulation = async () => {
    try {
      setSimulationLoading(true);

      const response = await fetch("/api/transactions/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });

      if (!response.ok) {
        throw new Error("Failed to resume simulation");
      }

      setSimulationStatus("running");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume simulation");
    } finally {
      setSimulationLoading(false);
    }
  };

  // Connect to SSE stream
  const connectToSSE = () => {
    try {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(authStreamUrl("/api/transactions/simulator"));

      eventSource.addEventListener("open", () => {
        setIsConnected(true);
        setError(null);
      });

      eventSource.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "transaction") {
            // Add new transaction to the top of live stream
            setLiveTransactions((prev) => [message.data, ...prev.slice(0, 49)]);

            // Also update the batch transactions if we're on page 1 and not searching
            if (page === 1 && !search && !statusFilter) {
              fetchTransactions();
            }
          } else if (message.type === "status") {
            if (message.status === "paused") {
              setSimulationStatus("paused");
            }
          } else if (message.type === "error") {
            console.error("Stream error:", message.error);
            setError(`Stream error: ${message.error}`);
          }
        } catch (err) {
          console.error("Error parsing SSE message:", err);
        }
      });

      eventSource.addEventListener("error", () => {
        setIsConnected(false);
        eventSource.close();

        // Try to reconnect after 3 seconds
        setTimeout(() => {
          if (simulationStatus === "running") {
            connectToSSE();
          }
        }, 3000);
      });

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error("Failed to connect to SSE:", err);
      setIsConnected(false);
      setError("Failed to connect to real-time stream");
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
  if (user?.role !== "compliance_officer") {
    tableColumns.splice(4, 0, { header: "Institution", accessor: "institution.name", width: "12%" });
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Transactions</h1>
        <p className="text-gray-600">View all {user?.role === "compliance_officer" ? "your institution's" : "system"} transactions</p>
      </div>

      {/* Real-Time Simulation Section */}
      <Card className="mb-6 border border-blue-200 bg-blue-50">
        <div className="p-4 border-b border-blue-200 mb-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            ⚡ Real-Time Transaction Simulation
          </h2>
          <p className="text-sm text-blue-800">
            Generate realistic simulated transactions and watch for AML rule violations in real-time. New transactions appear every 5-10 seconds.
          </p>
        </div>
        <div className="p-4">
          <SimulationControls
            status={simulationStatus}
            onStart={handleStartSimulation}
            onStop={handleStopSimulation}
            onPause={handlePauseSimulation}
            onResume={handleResumeSimulation}
            isLoading={simulationLoading}
          />
        </div>
      </Card>

      {/* Live Transaction Stream */}
      {simulationStatus !== "idle" && (
        <div className="mb-6">
          <LiveTransactionStream
            transactions={liveTransactions}
            isConnected={isConnected}
            isLoading={simulationLoading}
            maxDisplayItems={50}
          />
        </div>
      )}

      {/* Batch Transactions Section */}
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
            options={[
              { value: "", label: "All Statuses" },
              { value: "NORMAL", label: "Normal" },
              { value: "FLAGGED", label: "Flagged" },
              { value: "UNDER_REVIEW", label: "Under Review" },
              { value: "CLEARED", label: "Cleared" },
            ]}
          />
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
                            {col.format ? (col.format as unknown as (val: unknown) => React.ReactNode)(value) : value}
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
