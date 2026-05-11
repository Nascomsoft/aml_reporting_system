"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  amlAPI,
  CaseRecord,
  CaseAttachmentRecord,
  TransactionData,
} from "../../../AML_frontend/services/api";
import {
  Card,
  Badge,
  Button,
  FormInput,
  Select,
  AlertBanner,
} from "@/components";
import {
  formatDateNG,
  formatDateTimeNG,
} from "@/lib/localization";

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

const getTransactionStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "flagged":
      return "danger";
    case "under_review":
      return "warning";
    case "cleared":
      return "success";
    case "normal":
      return "primary";
    default:
      return "primary";
  }
};

const formatTransactionStatusDisplay = (status: string) => {
  return status
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getTransactionRiskColor = (riskScore: number) => {
  if (riskScore >= 80) return "danger";
  if (riskScore >= 50) return "warning";
  if (riskScore >= 25) return "primary";
  return "success";
};

const formatTransactionAmount = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toLocaleString()}`;
  }
};

export default function CaseDetail() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [discussion, setDiscussion] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [attachments, setAttachments] = useState<CaseAttachmentRecord[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [tagSaving, setTagSaving] = useState(false);
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  const [caseActionError, setCaseActionError] = useState<string | null>(null);
  const [audit, setAudit] = useState<string[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionData[]>([]);
  const [transactionHistoryError, setTransactionHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load case details
  useEffect(() => {
    async function fetchCaseDetails() {
      if (!caseId) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await amlAPI.getCase(caseId);
        setCaseData(data);

        const [discussionResult, auditResult, historyResult] = await Promise.allSettled([
          amlAPI.getCaseDiscussion(data.id),
          amlAPI.getCaseAudit(data.id),
          amlAPI.getCaseTransactionHistory(data.id, 5),
        ]);

        setTags(data.tags ?? []);
        setAttachments(data.attachments ?? []);
        if (discussionResult.status === "fulfilled") {
          setDiscussion(
            discussionResult.value.entries.map(
              (entry) => `${entry.user}: ${entry.message}`
            )
          );
        } else {
          setDiscussion([]);
          console.error("Error loading case discussion:", discussionResult.reason);
        }

        if (auditResult.status === "fulfilled") {
          setAudit(
            auditResult.value.timeline.map(
              (timelineEntry) =>
                `${timelineEntry.timestamp} ${timelineEntry.user} ${timelineEntry.event}`
            )
          );
        } else {
          setAudit([]);
          console.error("Error loading case audit:", auditResult.reason);
        }

        if (historyResult.status === "fulfilled") {
          setTransactionHistory(historyResult.value.transactions);
          setTransactionHistoryError(null);
        } else {
          setTransactionHistory([]);
          setTransactionHistoryError(
            "Transaction history could not be loaded right now."
          );
          console.error("Error loading transaction history:", historyResult.reason);
        }
      } catch (err) {
        console.error("Error loading case:", err);
        setError("Failed to load case details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchCaseDetails();
  }, [caseId]);

  const updateStatus = async (status: CaseRecord["status"]) => {
    if (!caseData) return;
    try {
      await amlAPI.updateCaseStatus(caseData.id, status);
      setCaseData({ ...caseData, status });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const escalateToSTR = async () => {
    if (!caseData) return;
    try {
      await amlAPI.escalateCaseToRegulator(
        caseData.id,
        "Escalated from case investigation workspace."
      );
      setCaseData({
        ...caseData,
        status: "escalated",
        escalationLevel: caseData.escalationLevel + 1,
      });
      setDiscussion([
        ...discussion,
        "System: Case escalated to STR submission module.",
      ]);
    } catch (err) {
      console.error("Error escalating case:", err);
    }
  };

  const createSTRFromCase = () => {
    if (caseData) {
      router.push(`/str/create?caseId=${encodeURIComponent(caseData.id)}`);
    }
  };

  const getSLAColor = (hours: number) => {
    if (hours < 4) return "#dc2626";
    if (hours < 24) return "#ea580c";
    return "#16a34a";
  };

  const handleAddTag = async () => {
    if (!caseData) return;

    const tag = newTag.trim();
    if (!tag) return;

    try {
      setTagSaving(true);
      setCaseActionError(null);
      const response = await amlAPI.addCaseTag(caseData.id, tag);
      setTags(response.tags);
      setNewTag("");
    } catch (err) {
      console.error("Error adding tag:", err);
      setCaseActionError("Failed to save the tag. Please try again.");
    } finally {
      setTagSaving(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!caseData) return;

    try {
      setTagSaving(true);
      setCaseActionError(null);
      const response = await amlAPI.deleteCaseTag(caseData.id, tag);
      setTags(response.tags);
    } catch (err) {
      console.error("Error removing tag:", err);
      setCaseActionError("Failed to remove the tag. Please try again.");
    } finally {
      setTagSaving(false);
    }
  };

  const handleAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!caseData) return;

    const files = Array.from(e.target.files || []);
    e.target.value = "";

    if (files.length === 0) return;

    try {
      setAttachmentSaving(true);
      setCaseActionError(null);
      const response = await amlAPI.uploadCaseAttachments(caseData.id, files);
      setAttachments(response.attachments);
    } catch (err) {
      console.error("Error uploading attachment:", err);
      setCaseActionError("Failed to upload the attachment. Please try again.");
    } finally {
      setAttachmentSaving(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!caseData) return;

    try {
      setAttachmentSaving(true);
      setCaseActionError(null);
      const response = await amlAPI.deleteCaseAttachment(caseData.id, attachmentId);
      setAttachments(response.attachments);
    } catch (err) {
      console.error("Error removing attachment:", err);
      setCaseActionError("Failed to remove the attachment. Please try again.");
    } finally {
      setAttachmentSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            ← Back to Cases
          </button>
        </div>
        <p className="text-text-secondary">Loading case details...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            ← Back to Cases
          </button>
        </div>
        <AlertBanner
          type="danger"
          title="Error"
          message={error || "Case not found"}
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
            ← Back to Cases
          </button>
          <h1 className="heading-2 text-primary m-0">
            Case {caseData.caseNumber}
          </h1>
          <p className="text-text-secondary text-base mt-2">
            {caseData.customer}
          </p>
        </div>
        <Badge variant={getStatusColor(caseData.status)}>
          {formatStatusDisplay(caseData.status)}
        </Badge>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Summary */}
          <Card>
            <h3 className="heading-4 text-primary m-0 mb-4">Case Summary</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-secondary">Customer</p>
                <p className="font-semibold text-text-primary">
                  {caseData.customer}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Risk Level</p>
                <Badge variant={getRiskColor(caseData.riskLevel)}>
                  {String(caseData.riskLevel).toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Investigator</p>
                <p className="font-semibold text-text-primary">
                  {caseData.investigator || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Escalation Level</p>
                <p className="font-semibold text-text-primary">
                  Level {caseData.escalationLevel}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">
                  Compliance Deadline
                </p>
                <p className="font-semibold text-text-primary">
                  {formatDateNG(new Date(caseData.complianceDeadline))}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">
                  Linked Alerts
                </p>
                <p className="font-semibold text-text-primary">
                  {caseData.linkedAlerts.length}
                </p>
              </div>
            </div>
          </Card>

          {/* SLA & Lifecycle Control */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SLA Card */}
            <Card>
              <h4 className="heading-6 text-primary m-0 mb-3">SLA Status</h4>
              <div
                className="text-center p-4 rounded-lg"
                style={{
                  backgroundColor: `${getSLAColor(caseData.slaRemainingHours)}20`,
                  borderLeft: `4px solid ${getSLAColor(caseData.slaRemainingHours)}`,
                }}
              >
                <p className="text-xs text-text-secondary mb-2">
                  Remaining
                </p>
                <p
                  className="heading-4 font-bold"
                  style={{
                    color: getSLAColor(caseData.slaRemainingHours),
                  }}
                >
                  {caseData.slaRemainingHours}h
                </p>
                {caseData.overdue && (
                  <p className="text-xs text-danger-600 mt-2">
                    ⚠️ SLA Overdue
                  </p>
                )}
                {caseData.slaRemainingHours < 4 && (
                  <p className="text-xs text-warning-600 mt-2">
                    ⏰ Approaching deadline
                  </p>
                )}
              </div>
            </Card>

            {/* Lifecycle Control */}
            <Card>
              <h4 className="heading-6 text-primary m-0 mb-3">
                Case Lifecycle
              </h4>
              <Select
                value={caseData.status}
                onChange={(e) =>
                  updateStatus(e.target.value as CaseRecord["status"])
                }
                options={[
                  {
                    value: "new",
                    label: "New",
                  },
                  {
                    value: "underReview",
                    label: "Under Review",
                  },
                  {
                    value: "escalated",
                    label: "Escalated",
                  },
                  {
                    value: "strSubmitted",
                    label: "STR Submitted",
                  },
                  {
                    value: "closed",
                    label: "Closed",
                  },
                ]}
                fullWidth
                disabled={
                  caseData.status?.toLowerCase() === "strsubmitted" ||
                  caseData.status?.toLowerCase() === "closed"
                }
              />
              <p className="text-xs text-text-secondary mt-3">
                Reopen requests require supervisor approval
              </p>
            </Card>
          </div>

          {/* Discussion & Collaboration */}
          <Card>
            <h4 className="heading-6 text-primary m-0 mb-4">Discussion</h4>

            {/* Messages */}
            <div className="bg-bg-secondary rounded-lg p-4 mb-4 max-h-64 overflow-y-auto space-y-3">
              {discussion.length > 0 ? (
                discussion.map((msg, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-text-primary border-l-2 border-primary pl-3"
                  >
                    {msg}
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-tertiary italic">
                  No messages yet. Start a discussion to collaborate with
                  investigators.
                </p>
              )}
            </div>

            {/* New Message Input */}
            <div className="space-y-3">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Add a note or question for collaboration..."
                className="input w-full"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={async () => {
                    if (newMessage.trim() && caseData) {
                      await amlAPI.postCaseDiscussion(
                        caseData.id,
                        newMessage.trim()
                      );
                      setDiscussion([
                        ...discussion,
                        `You: ${newMessage.trim()}`,
                      ]);
                      setNewMessage("");
                    }
                  }}
                >
                  Post Message
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={escalateToSTR}
                  disabled={
                    caseData.status?.toLowerCase() === "escalated" ||
                    caseData.status?.toLowerCase() === "strsubmitted" ||
                    caseData.status?.toLowerCase() === "closed"
                  }
                >
                  Escalate to STR
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  fullWidth
                  onClick={createSTRFromCase}
                  disabled={
                    caseData.status?.toLowerCase() !== "escalated"
                  }
                >
                  Create STR
                </Button>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-6 pt-6 border-t border-border">
              <h5 className="heading-6 text-primary m-0 mb-3">Tags</h5>
              {caseActionError && (
                <div className="mb-3">
                  <AlertBanner type="warning" title="Action failed" message={caseActionError} />
                </div>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag, idx) => (
                  <Badge key={idx} variant="primary">
                    {tag}
                    <button
                      type="button"
                      className="ml-2 cursor-pointer opacity-70 hover:opacity-100"
                      disabled={tagSaving}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <FormInput
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag"
                  fullWidth
                  disabled={tagSaving}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={tagSaving || newTag.trim().length === 0}
                >
                  {tagSaving ? "Saving..." : "Add"}
                </Button>
              </div>
            </div>

            {/* Attachments */}
            <div className="mt-6 pt-6 border-t border-border">
              <h5 className="heading-6 text-primary m-0 mb-3">
                Attachments
              </h5>
              <div className="space-y-2 mb-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between bg-bg-secondary p-2 rounded text-sm"
                  >
                    <div className="min-w-0 pr-3">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary hover:underline break-all"
                      >
                        📎 {attachment.originalName}
                      </a>
                      <p className="text-xs text-text-secondary mt-1">
                        {(attachment.size / 1024).toFixed(1)} KB • {attachment.uploadedBy}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      disabled={attachmentSaving}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentUpload}
                accept="application/pdf,.pdf"
              />
              <Button
                size="sm"
                variant="secondary"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                disabled={attachmentSaving}
              >
                {attachmentSaving ? "Uploading..." : "📤 Upload Document"}
              </Button>
              <p className="text-xs text-text-secondary mt-2">
                PDF files only.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Audit Timeline */}
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h4 className="heading-6 text-primary m-0">
                  Transaction History
                </h4>
                <p className="text-xs text-text-secondary mt-1">
                  Recent transactions for {caseData.customer}
                </p>
              </div>
              <Badge variant="primary">{transactionHistory.length}</Badge>
            </div>

            {transactionHistoryError ? (
              <p className="text-xs text-text-tertiary italic">
                {transactionHistoryError}
              </p>
            ) : transactionHistory.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {transactionHistory.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded border border-border bg-bg-secondary p-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-text-primary">
                          {formatTransactionAmount(
                            transaction.amount,
                            transaction.currency
                          )}
                        </p>
                        <p className="text-text-secondary mt-1">
                          {transaction.transactionRef}
                        </p>
                      </div>
                      <Badge variant={getTransactionStatusColor(transaction.status)}>
                        {formatTransactionStatusDisplay(transaction.status)}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-text-secondary">
                      <div>
                        <p className="uppercase tracking-wide text-[10px]">Date</p>
                        <p className="text-text-primary mt-1">
                          {formatDateTimeNG(transaction.date)}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wide text-[10px]">Type</p>
                        <p className="text-text-primary mt-1">
                          {transaction.transactionType}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wide text-[10px]">Account</p>
                        <p className="text-text-primary mt-1 break-all">
                          {transaction.accountNumber}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wide text-[10px]">Risk</p>
                        <Badge variant={getTransactionRiskColor(transaction.riskScore)}>
                          {transaction.riskScore}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-text-secondary">
                        {transaction.country || "Country not captured"}
                      </p>
                      <p className="text-text-secondary">
                        {transaction.institution.name}
                      </p>
                      {transaction.flagReason && (
                        <p className="text-text-primary bg-bg-primary/60 rounded px-2 py-1 leading-5">
                          {transaction.flagReason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary italic">
                No recent transactions found for this customer.
              </p>
            )}
          </Card>

          <Card className="mb-6">
            <h4 className="heading-6 text-primary m-0 mb-4">
              Linked Alerts
            </h4>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {caseData.linkedAlertDetails && caseData.linkedAlertDetails.length > 0 ? (
                caseData.linkedAlertDetails.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded border border-border bg-bg-secondary p-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-text-primary">{alert.title}</p>
                      <Badge variant={getRiskColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-2 text-text-secondary">
                      {alert.ruleTriggered}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-tertiary italic">
                  No linked alert details available.
                </p>
              )}
            </div>
          </Card>
          <Card>
            <h4 className="heading-6 text-primary m-0 mb-4">
              Audit Timeline
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {audit.length > 0 ? (
                audit.map((entry, idx) => (
                  <div
                    key={idx}
                    className="text-xs border-l-2 border-primary pl-3 py-2"
                  >
                    <p className="text-text-secondary">{entry}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-tertiary italic">
                  No audit entries yet. Case activity will appear here.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
