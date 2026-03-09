"use client";

import React, { useState } from "react";

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
  transactionSummary: TransactionSummary;
  rulesTriggered: RuleTriggered[];
  behavioralDeviations: BehavioralDeviation[];
  suspicionNarrative: string;
  evidence: Array<{ name: string; size: number; type: string }>;
  submissionDate?: string;
  receiptId?: string;
  trackingNumber?: string;
  lifecycle: "draft" | "submitted" | "in_review" | "accepted" | "rejected";
  regulatorStatus?: string;
}

export default function STRModule() {
  // State management
  const [strDraft, setStrDraft] = useState<STRDraft>({
    id: "STR-2026-0001",
    transactionSummary: {
      transactionId: "TXN-567890",
      amount: 150000,
      currency: "USD",
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
        description: "Transaction exceeds $100,000 daily limit",
        threshold: "$100,000",
        violationDetails: "Transaction amount: $150,000",
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
        baseline: "$5,000-$10,000",
        current: "$150,000",
        deviation: "+1,500%",
        riskLevel: "Critical",
      },
      {
        metric: "Geographic Consistency",
        baseline: "USA domestic only",
        current: "International transfer",
        deviation: "Pattern break",
        riskLevel: "High",
      },
    ],
    suspicionNarrative: "",
    evidence: [],
    lifecycle: "draft",
  });

  const [showPreview, setShowPreview] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [signatureAgreed, setSignatureAgreed] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    receiptId: string;
    trackingNumber: string;
    submissionTime: string;
  } | null>(null);

  // Generate receipt ID and tracking number
  const generateReceiptDetails = () => {
    const timestamp = Date.now();
    const receiptId = `STR-RCP-${timestamp}`;
    const trackingNumber = `TRK-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    return { receiptId, trackingNumber, submissionTime: new Date().toLocaleString() };
  };

  // Handle narrative text change
  const updateNarrative = (text: string) => {
    setStrDraft({ ...strDraft, suspicionNarrative: text });
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
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

  // Remove evidence file
  const removeEvidence = (index: number) => {
    const updated = strDraft.evidence.filter((_, i) => i !== index);
    setStrDraft({ ...strDraft, evidence: updated });
  };

  // Submit for verification
  const submitForVerification = () => {
    if (!strDraft.suspicionNarrative.trim()) {
      alert("Please provide a suspicion narrative before submission");
      return;
    }
    if (!signatureAgreed) {
      alert("Please agree to digital signature confirmation");
      return;
    }
    setShow2FA(true);
  };

  // Verify 2FA code
  const verify2FA = () => {
    if (verificationCode === "123456") {
      // Mock verification
      const receipt = generateReceiptDetails();
      setSubmissionReceipt(receipt);
      setStrDraft({
        ...strDraft,
        lifecycle: "submitted",
        receiptId: receipt.receiptId,
        trackingNumber: receipt.trackingNumber,
        submissionDate: receipt.submissionTime,
      });
      setShow2FA(false);
      setVerificationCode("");
      // Simulate regulator review after 3 seconds
      setTimeout(() => {
        setStrDraft((prev) => ({
          ...prev,
          lifecycle: "in_review",
          regulatorStatus: "Under Review - Expected completion: 5-7 business days",
        }));
      }, 3000);
    } else {
      alert("Invalid verification code");
    }
  };

  // Lifecycle status display
  const getLifecycleColor = (stage: string) => {
    switch (stage) {
      case "draft":
        return "#94a3b8";
      case "submitted":
        return "#60a5fa";
      case "in_review":
        return "#f59e0b";
      case "accepted":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  };

  const getLifecycleLabel = (stage: string) => {
    switch (stage) {
      case "draft":
        return "Draft";
      case "submitted":
        return "Submitted";
      case "in_review":
        return "Under Regulator Review";
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Rejected";
      default:
        return "Unknown";
    }
  };

  const isReadOnly = strDraft.lifecycle !== "draft";

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif", color: "#e5e7eb" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8, fontWeight: 700 }}>
        Suspicious Transaction Report (STR) Submission
      </h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        ⚠️ AML Regulatory Requirement - Legal binding submission
      </p>

      {/* Lifecycle Status Bar */}
      <div
        style={{
          background: "#0f172a",
          padding: 16,
          borderRadius: 6,
          marginBottom: 24,
          border: "1px solid #1e293b",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          SUBMISSION LIFECYCLE
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["draft", "submitted", "in_review", "accepted"].map((stage, idx) => (
            <React.Fragment key={stage}>
              <div
                style={{
                  padding: "6px 12px",
                  background:
                    stage === strDraft.lifecycle
                      ? getLifecycleColor(stage)
                      : "#1e293b",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight:
                    stage === strDraft.lifecycle ? 700 : 400,
                  color: stage === strDraft.lifecycle ? "white" : "#94a3b8",
                }}
              >
                {getLifecycleLabel(stage)}
              </div>
              {idx < 3 && (
                <div style={{ color: "#475569", fontSize: 16 }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
        {strDraft.lifecycle !== "draft" && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <span style={{ color: "#10b981" }}>Status: {getLifecycleLabel(strDraft.lifecycle)}</span>
            {strDraft.regulatorStatus && (
              <div style={{ marginTop: 4, color: "#94a3b8" }}>
                {strDraft.regulatorStatus}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submission Receipt (if submitted) */}
      {submissionReceipt && (
        <div
          style={{
            background: "#064e3b",
            padding: 16,
            borderRadius: 6,
            marginBottom: 24,
            border: "1px solid #10b981",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>
            ✓ SUBMISSION CONFIRMED
          </div>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            <div>
              <strong>Receipt ID:</strong> {submissionReceipt.receiptId}
            </div>
            <div>
              <strong>Tracking Number:</strong> {submissionReceipt.trackingNumber}
            </div>
            <div>
              <strong>Submission Time:</strong> {submissionReceipt.submissionTime}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Split View */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Left Column - Form */}
        <div>
          {/* Transaction Summary */}
          <section
            style={{
              background: "#0f172a",
              padding: 16,
              borderRadius: 6,
              marginBottom: 20,
              border: "1px solid #1e293b",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 12,
                color: "#60a5fa",
              }}
            >
              Transaction Summary
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                <strong>Transaction ID:</strong>
                <div style={{ color: "white", marginTop: 4 }}>
                  {strDraft.transactionSummary.transactionId}
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                <strong>Amount:</strong>
                <div style={{ color: "white", marginTop: 4 }}>
                  {strDraft.transactionSummary.amount.toLocaleString()}{" "}
                  {strDraft.transactionSummary.currency}
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                <strong>Date:</strong>
                <div style={{ color: "white", marginTop: 4 }}>
                  {strDraft.transactionSummary.date}
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                <strong>Type:</strong>
                <div style={{ color: "white", marginTop: 4 }}>
                  {strDraft.transactionSummary.transactionType}
                </div>
              </div>
              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                <strong>Account Holder:</strong>
                <div style={{ color: "white", marginTop: 4 }}>
                  {strDraft.transactionSummary.accountHolder} (
                  {strDraft.transactionSummary.accountNumber})
                </div>
              </div>
              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                <strong>Route:</strong>
                <div style={{ color: "white", marginTop: 4 }}>
                  {strDraft.transactionSummary.origin} →{" "}
                  {strDraft.transactionSummary.destination}
                </div>
              </div>
            </div>
          </section>

          {/* Rules Triggered */}
          <section
            style={{
              background: "#0f172a",
              padding: 16,
              borderRadius: 6,
              marginBottom: 20,
              border: "1px solid #1e293b",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 12,
                color: "#f59e0b",
              }}
            >
               Triggered Rules
            </h2>
            {strDraft.rulesTriggered.map((rule, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  background: "#1e293b",
                  borderRadius: 4,
                  marginBottom: 8,
                  borderLeft: `3px solid ${
                    rule.severity === "critical"
                      ? "#ef4444"
                      : rule.severity === "high"
                      ? "#f97316"
                      : "#f59e0b"
                  }`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 12 }}>{rule.ruleName}</strong>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                      {rule.description}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "2px 8px",
                      background:
                        rule.severity === "critical"
                          ? "#7f1d1d"
                          : rule.severity === "high"
                          ? "#7c2d12"
                          : "#78350f",
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 700,
                      color:
                        rule.severity === "critical"
                          ? "#fca5a5"
                          : rule.severity === "high"
                          ? "#fdba74"
                          : "#fcd34d",
                    }}
                  >
                    {rule.severity.toUpperCase()}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.7,
                  }}
                >
                  <strong>Threshold:</strong> {rule.threshold} |{" "}
                  <strong>Violation:</strong> {rule.violationDetails}
                </div>
              </div>
            ))}
          </section>

          {/* Behavioral Deviation Analysis */}
          <section
            style={{
              background: "#0f172a",
              padding: 16,
              borderRadius: 6,
              marginBottom: 20,
              border: "1px solid #1e293b",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 12,
                color: "#ec4899",
              }}
            >
               Behavioral Deviation Analysis
            </h2>
            <table
              style={{
                width: "100%",
                fontSize: 11,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 0",
                      opacity: 0.7,
                    }}
                  >
                    Metric
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 0",
                      opacity: 0.7,
                    }}
                  >
                    Baseline
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 0",
                      opacity: 0.7,
                    }}
                  >
                    Current
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 0",
                      opacity: 0.7,
                    }}
                  >
                    Deviation
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 0",
                      opacity: 0.7,
                    }}
                  >
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {strDraft.behavioralDeviations.map((dev, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "8px 0", color: "#94a3b8" }}>
                      {dev.metric}
                    </td>
                    <td style={{ padding: "8px 0", color: "#94a3b8" }}>
                      {dev.baseline}
                    </td>
                    <td style={{ padding: "8px 0", color: "white" }}>
                      {dev.current}
                    </td>
                    <td style={{ padding: "8px 0", color: "#ec4899" }}>
                      {dev.deviation}
                    </td>
                    <td style={{ padding: "8px 0" }}>
                      <span
                        style={{
                          color:
                            dev.riskLevel === "Critical"
                              ? "#fca5a5"
                              : dev.riskLevel === "High"
                              ? "#fdba74"
                              : "#fcd34d",
                        }}
                      >
                        {dev.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Suspicion Narrative */}
          <section
            style={{
              background: "#0f172a",
              padding: 16,
              borderRadius: 6,
              marginBottom: 20,
              border: isReadOnly ? "1px solid #475569" : "1px solid #1e293b",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 12,
                color: "#818cf8",
              }}
            >
              Suspicion Narrative
            </h2>
            <textarea
              value={strDraft.suspicionNarrative}
              onChange={(e) => updateNarrative(e.target.value)}
              disabled={isReadOnly}
              placeholder="Provide detailed explanation of suspicions based on transaction patterns, behavioral deviations, and triggered rules. Include specific observations and risk assessment."
              style={{
                width: "100%",
                minHeight: 120,
                padding: 12,
                background: isReadOnly ? "#0f172a" : "#1e293b",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "#e5e7eb",
                fontFamily: "monospace",
                fontSize: 12,
                cursor: isReadOnly ? "not-allowed" : "text",
                opacity: isReadOnly ? 0.6 : 1,
              }}
            />
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                opacity: 0.6,
              }}
            >
              Characters: {strDraft.suspicionNarrative.length} | Minimum: 100
            </div>
          </section>

          {/* Evidence Attachment */}
          <section
            style={{
              background: "#0f172a",
              padding: 16,
              borderRadius: 6,
              marginBottom: 20,
              border: isReadOnly ? "1px solid #475569" : "1px solid #1e293b",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 12,
                color: "#10b981",
              }}
            >
               Evidence Attachment
            </h2>
            <label
              style={{
                display: "block",
                padding: 12,
                background: isReadOnly ? "#0f172a" : "#1e293b",
                border: `2px dashed ${isReadOnly ? "#475569" : "#334155"}`,
                borderRadius: 4,
                cursor: isReadOnly ? "not-allowed" : "pointer",
                textAlign: "center",
                marginBottom: 12,
                opacity: isReadOnly ? 0.6 : 1,
              }}
            >
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={isReadOnly}
                style={{ display: "none" }}
              />
              <div style={{ fontSize: 12 }}>
                {isReadOnly ? "Submission locked" : "Click or drag files here"}
              </div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                Max 10MB per file - PDF, images, documents
              </div>
            </label>
            {strDraft.evidence.length > 0 && (
              <div>
                {strDraft.evidence.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 8,
                      background: "#1e293b",
                      borderRadius: 4,
                      marginBottom: 8,
                      fontSize: 11,
                    }}
                  >
                    <div>
                      📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={() => removeEvidence(idx)}
                        style={{
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          padding: "2px 6px",
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: 10,
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column - Verification Steps */}
        <div>
          {/* Digital Signature Confirmation */}
          <section
            style={{
              background: "#0f172a",
              padding: 16,
              borderRadius: 6,
              marginBottom: 20,
              border: "1px solid #1e293b",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 12,
                color: "#6366f1",
              }}
            >
               Digital Signature
            </h2>
            <div
              style={{
                padding: 12,
                background: "#1e293b",
                borderRadius: 4,
                marginBottom: 12,
                fontSize: 11,
              }}
            >
              <strong>Certifying Officer:</strong>
              <div style={{ color: "#94a3b8", marginTop: 4 }}>
                System: Compliance Officer
              </div>
              <strong style={{ marginTop: 8, display: "block" }}>
                Legal Statement:
              </strong>
              <div style={{ color: "#94a3b8", marginTop: 4, lineHeight: 1.6 }}>
                I certify that this report is true and accurate to the best of
                my knowledge and belief. This submission is legally binding and
                creates obligations under AML/CFT regulations.
              </div>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 12,
                cursor: isReadOnly ? "not-allowed" : "pointer",
                opacity: isReadOnly ? 0.6 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={signatureAgreed}
                onChange={(e) => setSignatureAgreed(e.target.checked)}
                disabled={isReadOnly}
                style={{ marginRight: 8, cursor: "pointer" }}
              />
              <span>I agree to the digital signature and legal finality</span>
            </label>
          </section>

          {/* Action Buttons */}
          <section
            style={{
              background: "#0f172a",
              padding: 16,
              borderRadius: 6,
              marginBottom: 20,
              border: "1px solid #1e293b",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Submit Actions
            </h2>
            <button
              onClick={() => setShowPreview(true)}
              disabled={isReadOnly}
              style={{
                width: "100%",
                padding: 10,
                background: isReadOnly ? "#475569" : "#334155",
                color: "white",
                border: "1px solid #475569",
                borderRadius: 4,
                cursor: isReadOnly ? "not-allowed" : "pointer",
                fontWeight: 600,
                marginBottom: 8,
                fontSize: 12,
              }}
            >
               Preview STR
            </button>
            <button
              onClick={submitForVerification}
              disabled={isReadOnly || !signatureAgreed}
              style={{
                width: "100%",
                padding: 10,
                background:
                  isReadOnly || !signatureAgreed ? "#475569" : "#0ea5e9",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor:
                  isReadOnly || !signatureAgreed ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Submit STR
            </button>
          </section>

          {/* Submission Info */}
          {strDraft.lifecycle !== "draft" && (
            <section
              style={{
                background: "#0f172a",
                padding: 16,
                borderRadius: 6,
                border: "1px solid #1e293b",
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                 Submission Details
              </h2>
              <div style={{ fontSize: 11 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: "#60a5fa" }}>Receipt ID:</strong>
                  <div style={{ color: "#94a3b8", marginTop: 2 }}>
                    {strDraft.receiptId}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: "#60a5fa" }}>Tracking #:</strong>
                  <div style={{ color: "#94a3b8", marginTop: 2 }}>
                    {strDraft.trackingNumber}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: "#60a5fa" }}>Submitted:</strong>
                  <div style={{ color: "#94a3b8", marginTop: 2 }}>
                    {strDraft.submissionDate}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              padding: 24,
              borderRadius: 8,
              maxWidth: 600,
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid #1e293b",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              STR Preview (Legal Document)
            </h2>
            <div
              style={{
                background: "#1e293b",
                padding: 16,
                borderRadius: 4,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <strong>SUSPICIOUS TRANSACTION REPORT</strong>
                <div style={{ opacity: 0.7, fontSize: 11 }}>
                  STR-ID: {strDraft.id} | Generated: {new Date().toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <strong>TRANSACTION SUMMARY:</strong>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {strDraft.transactionSummary.accountHolder} transferred{" "}
                  {strDraft.transactionSummary.amount.toLocaleString()}{" "}
                  {strDraft.transactionSummary.currency} on{" "}
                  {strDraft.transactionSummary.date}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <strong>RULES TRIGGERED ({strDraft.rulesTriggered.length}):</strong>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {strDraft.rulesTriggered
                    .map((r) => `${r.ruleName} (${r.severity})`)
                    .join(", ")}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <strong>SUSPICION NARRATIVE:</strong>
                <div
                  style={{
                    opacity: 0.8,
                    marginTop: 4,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {strDraft.suspicionNarrative || "[No narrative provided]"}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <strong>EVIDENCE:</strong>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {strDraft.evidence.length > 0
                    ? strDraft.evidence.map((e) => e.name).join(", ")
                    : "No evidence attached"}
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid #334155",
                  fontSize: 10,
                  opacity: 0.7,
                }}
              >
                <strong>⚠️ LEGAL STATEMENT:</strong>
                <div style={{ marginTop: 4 }}>
                  This is a binding legal document submitted to regulatory
                  authorities. Submission indicates compliance with AML/CFT
                  regulations and acceptance of full liability for accuracy.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "#334155",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  submitForVerification();
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "#0ea5e9",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Continue to Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Verification Modal */}
      {show2FA && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1001,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              padding: 24,
              borderRadius: 8,
              width: 400,
              border: "1px solid #1e293b",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
               Two-Factor Verification
            </h2>
            <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
              A verification code has been sent to your registered email.
              Enter it below to proceed with STR submission.
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              style={{
                width: "100%",
                padding: 10,
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "white",
                fontSize: 14,
                marginBottom: 16,
                textAlign: "center",
                letterSpacing: 4,
              }}
            />
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 16 }}>
              Demo code: <strong>123456</strong>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setShow2FA(false);
                  setVerificationCode("");
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "#334155",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={verify2FA}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "#0ea5e9",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Verify & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}