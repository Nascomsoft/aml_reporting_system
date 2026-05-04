"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Badge,
  AlertBanner,
} from "@/components";
import { formatDateNG, formatNGN, formatDateTimeNG } from "@/lib/localization";
import {
  getRiskColor,
  getStatusColor,
  getSTRStatusLabel,
  getSeverityLabel,
} from "@/lib/statusColorUtils";

interface TransactionDetail {
  id: string;
  amount: number;
  currency: string;
  date?: string | null;
  origin: string;
  destination: string;
}

interface RuleTriggered {
  ruleName: string;
  severity: string;
  description: string;
}

interface BehavioralDeviation {
  metric: string;
  baseline: string;
  current: string;
  deviation: string;
  riskLevel: string;
}

interface STRDetail {
  id: string;
  customerName: string;
  accountNumber: string;
  descriptionOfSuspicion: string;
  rulesTriggered: RuleTriggered[];
  behavioralDeviations: BehavioralDeviation[];
  narrative: string;
  riskClassification: string;
  status: string;
  caseNumber: string | null;
  submittedBy: string;
  submittingFinancialInstitution: string;
  submittedDate: string | null;
  createdAt: string;
  linkedTransactions: TransactionDetail[];
  transactionSummary: string;
}

export default function STRDetail() {
  const router = useRouter();
  const params = useParams();
  const strId = params?.id as string;

  const [strData, setStrData] = useState<STRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load STR details
  useEffect(() => {
    async function fetchSTRDetails() {
      if (!strId) return;

      try {
        setLoading(true);
        setError(null);
        const resp = await fetch(`/api/str/${strId}`);
        
        if (!resp.ok) {
          if (resp.status === 404) {
            setError("STR not found");
          } else {
            setError("Failed to load STR details");
          }
          return;
        }

        const data = await resp.json();
        setStrData(data);
      } catch (err) {
        console.error("Error loading STR:", err);
        setError("Failed to load STR details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchSTRDetails();
  }, [strId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            ← Back to STRs
          </button>
        </div>
        <p className="text-text-secondary">Loading STR details...</p>
      </div>
    );
  }

  if (error || !strData) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            ← Back to STRs
          </button>
        </div>
        <AlertBanner
          type="danger"
          title="Error"
          message={error || "STR not found"}
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-primary hover:text-primary-dark text-sm font-medium mb-3"
          >
            ← Back to STRs
          </button>
          <h1 className="heading-2 text-primary m-0">
            STR {strData.id}
          </h1>
          <p className="text-text-secondary text-base mt-2">
            {strData.customerName}
          </p>
        </div>
        <Badge variant={getStatusColor(strData.status)}>
          {getSTRStatusLabel(strData.status)}
        </Badge>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: STR Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* STR Summary */}
          <Card>
            <h3 className="heading-4 text-primary m-0 mb-4">STR Summary</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-secondary">Customer Name</p>
                <p className="font-semibold text-text-primary">
                  {strData.customerName}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Account Number</p>
                <p className="font-semibold text-text-primary font-mono">
                  {strData.accountNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Risk Classification</p>
                <Badge variant={getRiskColor(strData.riskClassification)}>
                  {strData.riskClassification.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Financial Institution</p>
                <p className="font-semibold text-text-primary">
                  {strData.submittingFinancialInstitution}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Submitted By</p>
                <p className="font-semibold text-text-primary">
                  {strData.submittedBy}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Submitted Date</p>
                <p className="font-semibold text-text-primary">
                  {strData.submittedDate
                    ? formatDateTimeNG(new Date(strData.submittedDate))
                    : "—"}
                </p>
              </div>
              {strData.caseNumber && (
                <div className="col-span-2">
                  <p className="text-xs text-text-secondary">Linked Case</p>
                  <p className="font-semibold text-text-primary">
                    {strData.caseNumber}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Transaction Summary */}
          {strData.linkedTransactions && strData.linkedTransactions.length > 0 && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Transaction Details
              </h3>
              <div className="space-y-3">
                {strData.linkedTransactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-bg-secondary rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">Transaction {idx + 1}</p>
                        <p className="text-xs text-text-secondary mt-1">
                          ID: {tx.id}
                        </p>
                      </div>
                      <p className="font-semibold text-accent-600">
                        {formatNGN(tx.amount, 2)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                      <div>
                        <p className="text-text-secondary">Date</p>
                        <p className="font-semibold mt-1">
                          {tx.date ? formatDateNG(new Date(tx.date)) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Route</p>
                        <p className="font-semibold mt-1">
                          {tx.origin} → {tx.destination}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Rules Triggered */}
          {strData.rulesTriggered && strData.rulesTriggered.length > 0 && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Rules Triggered
              </h3>
              <div className="space-y-3">
                {strData.rulesTriggered.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-bg-secondary rounded-lg border-l-4 border-warning"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{rule.ruleName}</p>
                        <p className="text-xs text-text-secondary mt-1">
                          {rule.description}
                        </p>
                      </div>
                      <Badge variant={getRiskColor(rule.severity)}>
                        {getSeverityLabel(rule.severity)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Behavioral Deviations */}
          {strData.behavioralDeviations && strData.behavioralDeviations.length > 0 && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Behavioral Deviations
              </h3>
              <div className="space-y-3">
                {strData.behavioralDeviations.map((dev, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-bg-secondary rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-sm">{dev.metric}</p>
                      <Badge
                        variant={
                          dev.riskLevel?.toLowerCase() === "critical"
                            ? "danger"
                            : dev.riskLevel?.toLowerCase() === "high"
                            ? "warning"
                            : "primary"
                        }
                      >
                        {dev.riskLevel}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs mt-2">
                      <div>
                        <p className="text-text-secondary">Baseline</p>
                        <p className="font-semibold mt-1">{dev.baseline}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Current</p>
                        <p className="font-semibold mt-1">{dev.current}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Deviation</p>
                        <p className="font-semibold mt-1 text-accent-600">
                          {dev.deviation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Suspicion Narrative */}
          {strData.narrative && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Suspicion Narrative
              </h3>
              <div className="p-4 bg-bg-secondary rounded-lg text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {strData.narrative}
              </div>
            </Card>
          )}

          {/* Description of Suspicion */}
          {strData.descriptionOfSuspicion && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Description of Suspicion
              </h3>
              <div className="p-4 bg-bg-secondary rounded-lg text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {strData.descriptionOfSuspicion}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Metadata & Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Information */}
          <Card>
            <h4 className="heading-6 text-primary m-0 mb-3">Status Information</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-text-secondary mb-1">Current Status</p>
                <Badge variant={getStatusColor(strData.status)}>
                  {getSTRStatusLabel(strData.status)}
                </Badge>
              </div>
              <div>
                <p className="text-text-secondary mb-1">Risk Level</p>
                <Badge variant={getRiskColor(strData.riskClassification)}>
                  {strData.riskClassification.toUpperCase()}
                </Badge>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-text-secondary mb-1">STR ID</p>
                <p className="font-mono font-semibold text-text-primary">
                  {strData.id}
                </p>
              </div>
              <div>
                <p className="text-text-secondary mb-1">Created</p>
                <p className="font-semibold text-text-primary">
                  {formatDateTimeNG(new Date(strData.createdAt))}
                </p>
              </div>
            </div>
          </Card>

          {/* Quick Reference */}
          <Card>
            <h4 className="heading-6 text-primary m-0 mb-3">Quick Reference</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Account:</span>
                <span className="font-mono font-semibold">
                  {strData.accountNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Institution:</span>
                <span className="font-semibold">
                  {strData.submittingFinancialInstitution.length > 20
                    ? strData.submittingFinancialInstitution.substring(0, 17) + "..."
                    : strData.submittingFinancialInstitution}
                </span>
              </div>
              {strData.submittedDate && (
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-text-secondary">Submitted:</span>
                  <span className="font-semibold">
                    {formatDateNG(new Date(strData.submittedDate))}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
