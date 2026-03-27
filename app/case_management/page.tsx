"use client";

import React, { useState, useRef, useEffect } from "react";
import { amlAPI, CaseRecord } from "../../AML_frontend/services/api";
import {
  Card,
  Badge,
  Button,
  FormInput,
  Select,
  Table,
  AlertBanner,
} from "@/components";
import {
  formatNGN,
  formatDateNG,
  formatDateTimeNG,
} from "@/lib/localization";

interface CaseListItem extends CaseRecord {
  caseNumber?: string;
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
  switch (status) {
    case "new":
      return "primary";
    case "underReview":
      return "warning";
    case "escalated":
      return "danger";
    case "strSubmitted":
      return "success";
    case "closed":
      return "primary";
    default:
      return "primary";
  }
};

export default function CaseManagement() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [discussion, setDiscussion] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [audit, setAudit] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCase, setLoadingCase] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load cases list
  useEffect(() => {
    async function fetchCases() {
      try {
        const resp = await fetch("/api/cases?pageSize=50");
        const data = await resp.json();
        setCases(data.cases || []);
        // Auto-load the first case
        if (data.cases?.length > 0) {
          loadCase(data.cases[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingList(false);
      }
    }
    fetchCases();
  }, []);

  async function loadCase(id: string) {
    setLoadingCase(true);
    try {
      const data = await amlAPI.getCase(id);
      setCaseData(data);
      const disc = await amlAPI.getCaseDiscussion(data.id);
      setDiscussion(
        disc.entries.map((e) => `${e.user}: ${e.message}`)
      );
      const aud = await amlAPI.getCaseAudit(data.id);
      setAudit(
        aud.timeline.map(
          (t) => `${t.timestamp} ${t.user} ${t.event}`
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCase(false);
    }
  }

  const updateStatus = async (status: CaseRecord["status"]) => {
    if (!caseData) return;
    try {
      await amlAPI.updateCaseStatus(caseData.id, status);
      setCaseData({ ...caseData, status });
    } catch (err) {
      console.error(err);
    }
  };

  const escalateToSTR = async () => {
    if (!caseData) return;
    try {
      await updateStatus("escalated");
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
      console.error(err);
    }
  };

  const getSLAColor = (hours: number) => {
    if (hours < 4) return "#dc2626";
    if (hours < 24) return "#ea580c";
    return "#16a34a";
  };

  if (loadingList) {
    return (
      <div className="p-8">
        <p className="text-text-secondary">Loading case management...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="heading-2 text-primary m-0">Case Management</h1>
        <p className="text-text-secondary text-base mt-2">
          Handle investigations, manage escalations, and prepare STR submissions
        </p>
      </div>

      {/* Case Selector */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-text-secondary block mb-2">
              Select Case
            </label>
            <Select
              value={caseData?.id ?? ""}
              onChange={(e) => e.target.value && loadCase(e.target.value)}
              options={cases.map((c) => ({
                value: c.id,
                label: `${c.caseNumber ?? c.id} — ${c.customer} (${c.status})`,
              }))}
              fullWidth
            />
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-text-secondary">Total Cases</p>
            <p className="heading-4 text-primary">{cases.length}</p>
          </div>
        </div>
      </Card>

      {caseData && !loadingCase && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Case Details & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Summary */}
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="heading-4 text-primary m-0">Case Summary</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Case {caseData.id}
                  </p>
                </div>
                <Badge variant={getStatusColor(caseData.status)}>
                  {String(caseData.status)
                    .replace(/([A-Z])/g, " $1")
                    .trim()
                    .toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
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
                    {caseData.investigator}
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
                    caseData.status === "strSubmitted" ||
                    caseData.status === "closed"
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
                      caseData.status === "escalated" ||
                      caseData.status === "strSubmitted" ||
                      caseData.status === "closed"
                    }
                  >
                    Escalate to STR
                  </Button>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-6 pt-6 border-t border-border">
                <h5 className="heading-6 text-primary m-0 mb-3">Tags</h5>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag, idx) => (
                    <Badge key={idx} variant="primary">
                      {tag}
                      <button
                        className="ml-2 cursor-pointer opacity-70 hover:opacity-100"
                        onClick={() =>
                          setTags(tags.filter((_, i) => i !== idx))
                        }
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
                    size="sm"
                    fullWidth
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const tag = newTag.trim();
                      if (tag) {
                        setTags([...tags, tag]);
                        setNewTag("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Attachments */}
              <div className="mt-6 pt-6 border-t border-border">
                <h5 className="heading-6 text-primary m-0 mb-3">
                  Attachments
                </h5>
                <div className="space-y-2 mb-3">
                  {attachments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-bg-secondary p-2 rounded text-sm"
                    >
                      <span>📎 {a}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setAttachments(attachments.filter((_, idx) => idx !== i))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAttachments([...attachments, file.name]);
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  fullWidth
                  onClick={() => fileInputRef.current?.click()}
                >
                  📤 Upload Document
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Audit Timeline */}
          <div className="lg:col-span-1">
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
      )}

      {!caseData && !loadingCase && (
        <AlertBanner
          type="info"
          title="No Case Selected"
          message="Select a case from the dropdown above to view details and manage the investigation."
        />
      )}
    </div>
  );
}