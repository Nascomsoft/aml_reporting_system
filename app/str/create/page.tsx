"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Badge,
  Button,
  AlertBanner,
  Modal,
} from "@/components";
import { authFetch } from "@/lib/auth-client";
import {
  formatNGN,
  formatDateNG,
  formatDateTimeNG,
} from "@/lib/localization";

const fetch = authFetch;

// Type definitions for STR submission
interface TransactionSummary {
  transactionId: string;
  amount: number;
  currency: string;
  date: string;
  origin: string;
  destination: string;
  accountHolder: string;
  accountNumber: string;
  transactionType: string;
}

interface RuleTriggered {
  ruleId: string;
  ruleName: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  threshold: string;
  violationDetails: string;
}

interface BehavioralDeviation {
  metric: string;
  baseline: string;
  current: string;
  deviation: string;
  riskLevel: string;
}

interface STRDraft {
  id: string;
  caseId?: string;
  caseNumber?: string;
  transactionSummary: TransactionSummary;
  rulesTriggered: RuleTriggered[];
  behavioralDeviations: BehavioralDeviation[];
  suspicionNarrative: string;
  evidence: Array<{ name: string; size: number; type: string }>;
  submissionDate?: string;
  receiptId?: string;
  trackingNumber?: string;
  lifecycle: "draft" | "submitted" | "under_review" | "closed";
  regulatorStatus?: string;
}

const STR_STEPS = [
  { id: 1, label: "Review", description: "Transaction & Rules" },
  { id: 2, label: "Analysis", description: "Behavioral Deviations" },
  { id: 3, label: "Narrative", description: "Suspicion Details" },
  { id: 4, label: "Evidence", description: "Supporting Documents" },
  { id: 5, label: "Submit", description: "Final Signature" },
];

export default function CreateSTR() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");
  const [currentStep, setCurrentStep] = useState(1);
  const [strDraft, setStrDraft] = useState<STRDraft>({
    id: "STR-2026-0001",
    transactionSummary: {
      transactionId: "TXN-567890",
      amount: 15000000,
      currency: "NGN",
      date: "2026-03-01",
      origin: "Account ABC123",
      destination: "Account XYZ789",
      accountHolder: "John Doe",
      accountNumber: "1234567890",
      transactionType: "Wire Transfer",
    },
    rulesTriggered: [
      {
        ruleId: "RULE-001",
        ruleName: "High Value Transaction Threshold",
        severity: "high",
        description: "Transaction exceeds ₦10,000,000 daily limit",
        threshold: "₦10,000,000",
        violationDetails: "Transaction amount: ₦15,000,000",
      },
      {
        ruleId: "RULE-005",
        ruleName: "Unusual Geographic Pattern",
        severity: "medium",
        description: "Transaction destination is high-risk jurisdiction",
        threshold: "N/A",
        violationDetails: "Destination IP: High-risk region",
      },
    ],
    behavioralDeviations: [
      {
        metric: "Transaction Frequency",
        baseline: "2-3 per month",
        current: "4 in 2 days",
        deviation: "+67%",
        riskLevel: "High",
      },
      {
        metric: "Transaction Amount Average",
        baseline: "₦500,000-₦1,000,000",
        current: "₦15,000,000",
        deviation: "+1,500%",
        riskLevel: "Critical",
      },
      {
        metric: "Geographic Consistency",
        baseline: "Domestic only",
        current: "International transfer",
        deviation: "Pattern break",
        riskLevel: "High",
      },
    ],
    suspicionNarrative: "",
    evidence: [],
    lifecycle: "draft",
  });

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [signatureAgreed, setSignatureAgreed] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    receiptId: string;
    trackingNumber: string;
    submissionTime: string;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCaseContext() {
      if (!caseId) return;

      try {
        setLoadError(null);
        const resp = await fetch(`/api/cases/${encodeURIComponent(caseId)}`);
        if (!resp.ok) {
          setLoadError("Could not load linked case context.");
          return;
        }

        const caseRecord = await resp.json();
        const primaryAlert = caseRecord.linkedAlertDetails?.[0];
        const transactionId = primaryAlert?.transactionIds?.[0] ?? caseRecord.id;
        const amount = primaryAlert?.amount ?? 0;
        const risk = primaryAlert?.severity ?? caseRecord.riskLevel ?? "medium";

        setStrDraft((current) => ({
          ...current,
          caseId: caseRecord.id,
          caseNumber: caseRecord.caseNumber,
          transactionSummary: {
            transactionId,
            amount,
            currency: "NGN",
            date: new Date().toISOString().slice(0, 10),
            origin: primaryAlert?.accountNumber ?? "Linked account",
            destination: primaryAlert?.customerName ?? caseRecord.customer,
            accountHolder: caseRecord.customer,
            accountNumber: primaryAlert?.accountNumber ?? "UNKNOWN",
            transactionType: "Linked alert transaction",
          },
          rulesTriggered:
            caseRecord.linkedAlertDetails?.map((alert: {
              id: string;
              ruleTriggered: string;
              severity: "low" | "medium" | "high" | "critical";
              title: string;
              riskScore: number;
            }) => ({
              ruleId: alert.id,
              ruleName: alert.ruleTriggered,
              severity: alert.severity,
              description: alert.title,
              threshold: "Rule threshold",
              violationDetails: `Risk score ${alert.riskScore}`,
            })) ?? current.rulesTriggered,
          behavioralDeviations: [
            {
              metric: "Case risk profile",
              baseline: "Normal customer behavior",
              current: `${String(risk).toUpperCase()} risk investigation`,
              deviation: "Alert-driven escalation",
              riskLevel: String(risk).charAt(0).toUpperCase() + String(risk).slice(1),
            },
          ],
          suspicionNarrative:
            caseRecord.summary ??
            `Case ${caseRecord.caseNumber} was escalated for STR submission after investigation of linked suspicious activity alerts.`,
        }));
      } catch (err) {
        console.error("Failed to load STR case context:", err);
        setLoadError("Could not load linked case context.");
      }
    }

    void loadCaseContext();
  }, [caseId]);

  const generateReceiptDetails = () => {
    const timestamp = Date.now();
    const receiptId = `STR-RCP-${timestamp}`;
    const trackingNumber = `TRK-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    return {
      receiptId,
      trackingNumber,
      submissionTime: new Date().toLocaleString("en-NG"),
    };
  };

  const updateNarrative = (text: string) => {
    setStrDraft({ ...strDraft, suspicionNarrative: text });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newEvidence = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setStrDraft({
      ...strDraft,
      evidence: [...strDraft.evidence, ...newEvidence],
    });
  };

  const removeEvidence = (index: number) => {
    const updated = strDraft.evidence.filter((_, i) => i !== index);
    setStrDraft({ ...strDraft, evidence: updated });
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return true; // Review step is always viewable
      case 2:
        return true; // Analysis step is always viewable
      case 3:
        return strDraft.suspicionNarrative.trim().length >= 50; // At least 50 chars
      case 4:
        return true;
      case 5:
        return signatureAgreed; // Signature agreed
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (canProceedToNext() && currentStep < STR_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitSTR = async () => {
    if (!signatureAgreed) {
      alert("Please agree to digital signature");
      return;
    }

    try {
      // Determine risk classification based on highest severity rule
      const maxSeverity = strDraft.rulesTriggered.reduce((max, rule) => {
        const severities = { critical: 4, high: 3, medium: 2, low: 1 };
        return Math.max(max, severities[rule.severity] || 0);
      }, 0);
      const severityMap = { 4: "critical", 3: "high", 2: "medium", 1: "low" };
      const riskClassification = severityMap[maxSeverity as keyof typeof severityMap] || "medium";

      const resp = await fetch("/api/str", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionSummary: `Transaction ID: ${strDraft.transactionSummary.transactionId}, Amount: ${strDraft.transactionSummary.amount} ${strDraft.transactionSummary.currency}, Date: ${strDraft.transactionSummary.date}`,
          customerName: strDraft.transactionSummary.accountHolder,
          accountNumber: strDraft.transactionSummary.accountNumber,
          descriptionOfSuspicion: strDraft.suspicionNarrative,
          rulesTriggered: strDraft.rulesTriggered.map((r) => r.ruleName),
          transactionIds: [strDraft.transactionSummary.transactionId],
          behavioralDeviations: strDraft.behavioralDeviations.map((bd) => `${bd.metric}: ${bd.deviation} (${bd.riskLevel})`),
          narrative: strDraft.suspicionNarrative,
          riskClassification: riskClassification,
          supportingDocuments: strDraft.evidence.map((e) => e.name),
          caseId: strDraft.caseId,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        alert("Submission failed: " + (err.error || "Unknown error"));
        return;
      }

      const result = await resp.json();
      const receipt = generateReceiptDetails();
      setSubmissionReceipt(receipt);
      setStrDraft({
        ...strDraft,
        lifecycle: "submitted",
        receiptId: receipt.receiptId,
        trackingNumber: receipt.trackingNumber,
        submissionDate: receipt.submissionTime,
      });
      setShowSubmitModal(false);

      // Redirect to list page after successful submission
      setTimeout(() => {
        router.push(`/str/${result.id}`);
      }, 2000);
    } catch (err) {
      console.error("STR API error:", err);
      alert("Submission error. Please try again.");
    }
  };

  const isReadOnly = strDraft.lifecycle !== "draft";

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-primary hover:text-primary-dark text-sm font-medium mb-3"
          >
            ← Back
          </button>
          <h1 className="heading-2 text-primary m-0">
            Suspicious Transaction Report (STR)
          </h1>
          <p className="text-text-secondary text-base mt-2">
            ⚠️ Regulatory requirement - Complete all steps for submission
          </p>
        </div>
      </div>

      {/* Submission Receipt (if submitted) */}
      {submissionReceipt && (
        <AlertBanner
          type="success"
          title="✓ STR Submitted Successfully"
          message={`Receipt ID: ${submissionReceipt.receiptId} | Tracking: ${submissionReceipt.trackingNumber}`}
        />
      )}

      {loadError && (
        <AlertBanner
          type="warning"
          title="Case context unavailable"
          message={loadError}
        />
      )}

      {strDraft.caseNumber && (
        <AlertBanner
          type="info"
          title="Case-linked STR"
          message={`Prefilled from ${strDraft.caseNumber}. Submission will update the linked case and alerts.`}
        />
      )}

      {/* Lifecycle Status */}
      {strDraft.lifecycle !== "draft" && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Status</p>
              <Badge
                variant={
                  strDraft.lifecycle === "submitted"
                    ? "primary"
                    : strDraft.lifecycle === "under_review"
                    ? "warning"
                    : "success"
                }
              >
                {String(strDraft.lifecycle).replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
            {strDraft.regulatorStatus && (
              <p className="text-sm text-text-secondary">
                {strDraft.regulatorStatus}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Step Indicator & Progress */}
      <Card>
        <div className="mb-4">
          <p className="text-xs text-text-secondary mb-3">
            Step {currentStep} of {STR_STEPS.length}
          </p>
          <div className="w-full bg-bg-secondary rounded-full h-2 mb-4">
            <div
              className="bg-linear-to-r from-primary to-accent h-2 rounded-full transition-all"
              style={{
                width: `${((currentStep - 1) / (STR_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between gap-2">
            {STR_STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => !isReadOnly && step.id <= currentStep && setCurrentStep(step.id)}
                disabled={isReadOnly || step.id > currentStep}
                className={`flex-1 text-center p-3 rounded-lg transition-all ${
                  step.id === currentStep
                    ? "bg-primary bg-opacity-20 border border-primary"
                    : step.id < currentStep
                    ? "bg-bg-secondary border border-border"
                    : "bg-bg-secondary border border-border opacity-50"
                }`}
              >
                <p className="text-xs font-semibold text-primary">
                  Step {step.id}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {step.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Review Transaction & Rules */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Card>
                <h3 className="heading-4 text-primary m-0 mb-4">
                  Transaction Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">
                      Transaction ID
                    </p>
                    <p className="font-semibold">
                      {strDraft.transactionSummary.transactionId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Amount</p>
                    <p className="font-semibold text-accent-600">
                      {formatNGN(strDraft.transactionSummary.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Date</p>
                    <p className="font-semibold">
                      {formatDateNG(
                        new Date(strDraft.transactionSummary.date)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Type</p>
                    <p className="font-semibold">
                      {strDraft.transactionSummary.transactionType}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-text-secondary mb-1">
                      Account Holder
                    </p>
                    <p className="font-semibold">
                      {strDraft.transactionSummary.accountHolder} (
                      {strDraft.transactionSummary.accountNumber})
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-text-secondary mb-1">Route</p>
                    <p className="font-semibold text-sm">
                      {strDraft.transactionSummary.origin} →{" "}
                      {strDraft.transactionSummary.destination}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="heading-4 text-primary m-0 mb-4">
                  Triggered Rules
                </h3>
                <div className="space-y-3">
                  {strDraft.rulesTriggered.map((rule, idx) => (
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
                        <Badge
                          variant={
                            rule.severity === "critical"
                              ? "danger"
                              : rule.severity === "high"
                              ? "warning"
                              : "primary"
                          }
                        >
                          {rule.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-tertiary mt-2">
                        <span className="font-semibold">Threshold:</span>{" "}
                        {rule.threshold} |{" "}
                        <span className="font-semibold">Violation:</span>{" "}
                        {rule.violationDetails}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Step 2: Behavioral Analysis */}
          {currentStep === 2 && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Behavioral Deviations
              </h3>
              <div className="space-y-3">
                {strDraft.behavioralDeviations.map((dev, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-bg-secondary rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-sm">{dev.metric}</p>
                      <Badge
                        variant={
                          dev.riskLevel === "Critical"
                            ? "danger"
                            : dev.riskLevel === "High"
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

          {/* Step 3: Suspicion Narrative */}
          {currentStep === 3 && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Suspicion Narrative
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Provide detailed explanation of suspicions based on transaction
                patterns and behavioral deviations.
              </p>
              <textarea
                value={strDraft.suspicionNarrative}
                onChange={(e) => updateNarrative(e.target.value)}
                disabled={isReadOnly}
                placeholder="Describe your observations, risk assessment, and suspicion details..."
                className="input w-full"
                rows={8}
              />
              <p className="text-xs text-text-secondary mt-2">
                Character count:{" "}
                <span
                  className={
                    strDraft.suspicionNarrative.length >= 50
                      ? "text-accent-600"
                      : "text-warning-600"
                  }
                >
                  {strDraft.suspicionNarrative.length}
                </span>{" "}
                (Minimum: 50)
              </p>
              {strDraft.suspicionNarrative.length < 50 && (
                <AlertBanner
                  type="warning"
                  title="Narrative Too Short"
                  message={`Write at least ${50 - strDraft.suspicionNarrative.length} more characters`}
                />
              )}
            </Card>
          )}

          {/* Step 4: Evidence Upload */}
          {currentStep === 4 && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Supporting Evidence
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Upload documents, screenshots, or other evidence supporting
                your suspicion.
              </p>

              <label className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isReadOnly}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                />
                <div className="text-center">
                  <p className="text-base font-semibold text-primary mb-1">
                    📤 Drag files here or click to select
                  </p>
                  <p className="text-xs text-text-secondary">
                    PDF, images, documents up to 10MB each
                  </p>
                </div>
              </label>

              {strDraft.evidence.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-sm font-semibold text-text-secondary mb-3">
                    Attached Files ({strDraft.evidence.length})
                  </p>
                  {strDraft.evidence.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                    >
                      <p className="text-sm">
                        📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </p>
                      {!isReadOnly && (
                        <button
                          onClick={() => removeEvidence(idx)}
                          className="text-danger-600 hover:text-danger-700 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {strDraft.evidence.length === 0 && (
                <AlertBanner
                  type="info"
                  title="No Evidence Uploaded"
                  message="Supporting documents can be added now or attached later in the case record."
                />
              )}
            </Card>
          )}

          {/* Step 5: Submit & Signature */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <Card>
                <h3 className="heading-4 text-primary m-0 mb-4">
                  Digital Signature & Legal Certification
                </h3>
                <div className="p-4 bg-bg-secondary rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">
                    ⚖️ Legal Statement
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    I certify that this report is true and accurate to the best
                    of my knowledge and belief. This submission is legally
                    binding and creates obligations under AML/CFT regulations.
                    Providing false information is a criminal offense.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={signatureAgreed}
                    onChange={(e) => setSignatureAgreed(e.target.checked)}
                    disabled={isReadOnly}
                    className="mt-1"
                  />
                  <span className="text-sm text-text-primary">
                    I confirm and agree to the legal statement above. I
                    authenticate this submission as accurate and complete.
                  </span>
                </label>

                {signatureAgreed && (
                  <AlertBanner
                    type="success"
                    title="✓ Legal Certification Approved"
                    message="Ready to submit. Your signature will be logged and verified."
                  />
                )}
              </Card>

              {/* Submission Summary */}
              <Card>
                <h3 className="heading-4 text-primary m-0 mb-4">
                  Submission Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">
                      Transaction Amount:
                    </span>
                    <span className="font-semibold">
                      {formatNGN(strDraft.transactionSummary.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Rules Triggered:</span>
                    <span className="font-semibold">
                      {strDraft.rulesTriggered.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Narrative Length:</span>
                    <span
                      className={`font-semibold ${
                        strDraft.suspicionNarrative.length >= 50
                          ? "text-accent-600"
                          : "text-warning-600"
                      }`}
                    >
                      {strDraft.suspicionNarrative.length} chars
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-text-secondary">Documents:</span>
                    <span className="font-semibold">
                      {strDraft.evidence.length} file(s)
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar: Navigation & Actions */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <h4 className="heading-6 text-primary m-0 mb-3">Progress</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Current Step:</span>
                <Badge variant="primary">
                  {currentStep} of {STR_STEPS.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Status:</span>
                <Badge
                  variant={
                    strDraft.lifecycle === "draft"
                      ? "warning"
                      : strDraft.lifecycle === "submitted"
                      ? "primary"
                      : "success"
                  }
                >
                  {strDraft.lifecycle.toUpperCase()}
                </Badge>
              </div>
            </div>
          </Card>

          <Card>
            <h4 className="heading-6 text-primary m-0 mb-3">Checklist</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center ${
                    currentStep >= 1
                      ? "bg-accent-600 text-white"
                      : "bg-border text-text-secondary"
                  }`}
                >
                  ✓
                </span>
                <span className="text-text-secondary">Transaction review</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center ${
                    currentStep >= 2
                      ? "bg-accent-600 text-white"
                      : "bg-border text-text-secondary"
                  }`}
                >
                  ✓
                </span>
                <span className="text-text-secondary">Analysis review</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center ${
                    strDraft.suspicionNarrative.length >= 50
                      ? "bg-accent-600 text-white"
                      : "bg-border text-text-secondary"
                  }`}
                >
                  ✓
                </span>
                <span className="text-text-secondary">Narrative written</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center ${
                    strDraft.evidence.length > 0
                      ? "bg-accent-600 text-white"
                      : "bg-border text-text-secondary"
                  }`}
                >
                  ✓
                </span>
                <span className="text-text-secondary">Evidence attached</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center ${
                    signatureAgreed
                      ? "bg-accent-600 text-white"
                      : "bg-border text-text-secondary"
                  }`}
                >
                  ✓
                </span>
                <span className="text-text-secondary">Signature agreed</span>
              </div>
            </div>
          </Card>

          <Card>
            <h4 className="heading-6 text-primary m-0 mb-3">Actions</h4>
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrevStep}
                disabled={currentStep === 1 || isReadOnly}
                fullWidth
              >
                ← Previous
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleNextStep}
                disabled={!canProceedToNext() || currentStep === STR_STEPS.length}
                fullWidth
              >
                Next →
              </Button>

              {currentStep === STR_STEPS.length && !isReadOnly && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={!signatureAgreed}
                  fullWidth
                >
                  🚀 Submit STR
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Submit Modal */}
      <Modal
        isOpen={showSubmitModal}
        title="Confirm STR Submission"
        onClose={() => setShowSubmitModal(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowSubmitModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={submitSTR}
              disabled={!signatureAgreed}
            >
              Confirm Submission
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AlertBanner
            type="warning"
            title="⚠️ Final Confirmation Required"
            message="This is a legally binding submission. Once submitted, it cannot be withdrawn."
          />
          <Card noPadding>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">STR ID:</span>
                <span className="font-mono font-semibold">
                  {strDraft.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Amount:</span>
                <span className="font-semibold">
                  {formatNGN(strDraft.transactionSummary.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Documents:</span>
                <span className="font-semibold">
                  {strDraft.evidence.length}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-text-secondary">Submission Time:</span>
                <span className="font-semibold">
                  {formatDateTimeNG(new Date())}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
}
