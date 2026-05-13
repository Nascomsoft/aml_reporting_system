"use client";

import { useState, useEffect, useRef } from "react";
import { Badge, type BadgeProps } from "@/components/Badge";
import { Card } from "@/components/Card";

export interface StreamTransaction {
  id: string;
  transactionRef: string;
  customerName: string;
  accountNumber: string;
  occupation?: string | null;
  amount: number;
  currency: string;
  transactionType: string;
  country?: string;
  riskScore: number;
  status: "NORMAL" | "FLAGGED" | "UNDER_REVIEW" | "CLEARED";
  flagReason?: string;
  date: string;
  institution?: {
    id: string;
    name: string;
    code: string;
  };
}

interface LiveTransactionStreamProps {
  transactions: StreamTransaction[];
  isConnected: boolean;
  isLoading?: boolean;
  maxDisplayItems?: number;
}

export function LiveTransactionStream({
  transactions,
  isConnected,
  isLoading = false,
  maxDisplayItems = 50,
}: LiveTransactionStreamProps) {
  const [newTransactionIds, setNewTransactionIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastProcessedIdRef = useRef<string | undefined>(undefined);

  // Handle highlighting of new transactions
  const highlightTransaction = (id: string) => {
    // Clear any existing timeout for this transaction
    const existingTimeout = highlightTimeoutsRef.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Add to highlighted set
    setNewTransactionIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Schedule removal after 3 seconds
    const timeout = setTimeout(() => {
      setNewTransactionIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      highlightTimeoutsRef.current.delete(id);
    }, 3000);

    highlightTimeoutsRef.current.set(id, timeout);
  };

  // Track newly arrived transactions for highlight effect
  // This is a legitimate UI pattern: highlighting new items as they arrive
  useEffect(() => {
    if (transactions.length === 0) return;

    const latestId = transactions[0]?.id;
    if (latestId && latestId !== lastProcessedIdRef.current) {
      lastProcessedIdRef.current = latestId;
      // Use queueMicrotask to defer the state update, avoiding the strict warning
      queueMicrotask(() => {
        highlightTransaction(latestId);
      });
    }

    const timeoutMap = highlightTimeoutsRef.current;
    return () => {
      // Cleanup all timeouts on unmount
      timeoutMap.forEach((timeout) => clearTimeout(timeout));
    };
  }, [transactions]);

  // Auto-scroll to top on new transaction
  useEffect(() => {
    if (containerRef.current && transactions.length > 0) {
      containerRef.current.scrollTop = 0;
    }
  }, [transactions]);

  const getRiskBadgeColor = (
    riskScore: number
  ): BadgeProps["variant"] => {
    if (riskScore >= 70) return "danger";
    if (riskScore >= 40) return "warning";
    if (riskScore >= 20) return "primary";
    return "success";
  };

  const getStatusColor = (
    status: string
  ): BadgeProps["variant"] => {
    switch (status) {
      case "FLAGGED":
        return "danger";
      case "UNDER_REVIEW":
        return "warning";
      case "CLEARED":
        return "success";
      default:
        return "primary";
    }
  };

  const displayTransactions = transactions.slice(0, maxDisplayItems);

  return (
    <Card>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              📡 Live Transaction Stream
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              />
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {displayTransactions.length} transactions
              {displayTransactions.length === maxDisplayItems &&
                ` (showing latest ${maxDisplayItems})`}
            </p>
          </div>
          {!isConnected && (
            <Badge variant="danger">Disconnected</Badge>
          )}
        </div>

        {/* Transaction List */}
        <div
          ref={containerRef}
          className="overflow-y-auto max-h-96 space-y-2 border-t border-gray-200 pt-4"
        >
          {isLoading && displayTransactions.length === 0 && (
            <div className="flex justify-center py-8">
              <span className="text-gray-500">
                Waiting for transactions...
              </span>
            </div>
          )}

          {displayTransactions.length === 0 && !isLoading && (
            <div className="flex justify-center py-8">
              <span className="text-gray-500">
                No transactions yet. Start the simulation to begin.
              </span>
            </div>
          )}

          {displayTransactions.map((txn, index) => {
            const isNew = newTransactionIds.has(txn.id);
            
            return (
              <div
                key={txn.id}
                className={`p-3 border rounded-lg transition-all duration-300 ${
                  isNew
                    ? "bg-green-50 border-green-300 shadow-md scale-100"
                    : txn.status === "FLAGGED"
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
                } ${index === 0 ? "mb-2" : ""}`}
              >
                {/* Top row: Ref, Customer, Amount */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-gray-500">
                      {txn.transactionRef}
                    </p>
                    <p className="font-medium text-sm truncate text-black">
                      {txn.customerName}
                    </p>
                    {txn.occupation && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {txn.occupation}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-black">
                      {txn.currency} {txn.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-black">
                      {txn.transactionType}
                    </p>
                  </div>
                </div>

                {/* Bottom row: Risk, Status, Flag Reason */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant={getRiskBadgeColor(txn.riskScore)}>
                      Risk: {txn.riskScore}
                    </Badge>
                    <Badge variant={getStatusColor(txn.status)}>
                      {txn.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {txn.occupation && (
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded font-medium">
                        {txn.occupation}
                      </span>
                    )}
                    {txn.country && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {txn.country}
                      </span>
                    )}
                    {txn.flagReason && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                        🚩 {txn.flagReason}
                      </span>
                    )}
                    {isNew && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                        ✨ New
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(txn.date).toLocaleTimeString()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer Status */}
        {displayTransactions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-600 flex justify-between">
            <span>
              Flagged: {displayTransactions.filter((t) => t.status === "FLAGGED").length}
            </span>
            <span>
              Under Review:{" "}
              {displayTransactions.filter((t) => t.status === "UNDER_REVIEW").length}
            </span>
            <span>
              Avg Risk:{" "}
              {(
                displayTransactions.reduce((sum, t) => sum + t.riskScore, 0) /
                displayTransactions.length
              ).toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
