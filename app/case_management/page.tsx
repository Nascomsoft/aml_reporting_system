"use client";

import React, { useState, useRef } from "react";
import { amlAPI, CaseRecord } from "../../AML_frontend/services/api";


export default function CaseManagement() {
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [newStatus, setNewStatus] = useState<CaseRecord["status"]>("new");
  const [discussion, setDiscussion] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [audit, setAudit] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const buttonBaseStyle: React.CSSProperties = {
    cursor: "pointer",
    border: "1px solid white",
    borderRadius: 4,
    background: "transparent",
    padding: "6px 10px",
    color: "#f9fafb",
  };

  // mock load
  React.useEffect(() => {
    // load case from API plus supplemental data
    async function fetchCase() {
      try {
        const data = await amlAPI.getCase("CASE-1234");
        setCaseData(data);
        const disc = await amlAPI.getCaseDiscussion(data.id);
        setDiscussion(disc.entries.map((e) => `${e.user}: ${e.message}`));
        const aud = await amlAPI.getCaseAudit(data.id);
        setAudit(aud.timeline.map((t) => `${t.timestamp} ${t.user} ${t.event}`));
      } catch (err) {
        console.error(err);
      }
    }
    fetchCase();
  }, []);

  const updateStatus = async (status: CaseRecord["status"]) => {
    if (!caseData) return;
    try {
      await amlAPI.updateCaseStatus(caseData.id, status);
      setCaseData({ ...caseData, status });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 20, color: "#e5e7eb" }}>
      <h1>Case Management</h1>

      {/* case summary panel */}
      {caseData && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
          <div style={{ background: "#0b1220", padding: 12, borderRadius: 6 }}>
            <h2>Case Summary</h2>
            <p><strong>Case ID:</strong> {caseData.id}</p>
            <p><strong>Linked Alerts:</strong> {caseData.linkedAlerts.join(", ")}</p>
            <p><strong>Customer:</strong> {caseData.customer}</p>
            <p><strong>Risk Level:</strong> {caseData.riskLevel}</p>
            <p><strong>Investigator:</strong> {caseData.investigator}</p>
            <p><strong>Status:</strong> {caseData.status}</p>
            <p><strong>Escalation:</strong> Level {caseData.escalationLevel}</p>
            <p><strong>Deadline:</strong> {caseData.complianceDeadline}</p>
          </div>

          {/* tools & timeline */}
          <div>
                  {/* lifecycle enforcement */}
            <section style={{ background: "#0b1220", padding: 12, borderRadius: 6, marginBottom: 20 }}>
              <h2>Lifecycle Control</h2>
              <select value={caseData.status} onChange={(e) => updateStatus(e.target.value as any)} style={{ background: "#0b1220", color: "#f9fafb" }} disabled={caseData.status === "strSubmitted" || caseData.status === "closed"}>
                <option value="new">New</option>
                <option value="underReview">Under Review</option>
                <option value="escalated">Escalated</option>
                <option value="strSubmitted">STR Submitted</option>
                <option value="closed">Closed</option>
              </select>
              <p style={{ marginTop: 8 }}><em>Reopen requests require supervisor approval</em></p>
            </section>

            {/* SLA tools */}
            <section style={{ background: "#0b1220", padding: 12, borderRadius: 6, marginBottom: 20 }}>
              <h2>SLA</h2>
              <p>Remaining: {caseData.slaRemainingHours}h {caseData.overdue && <span style={{ color: "#ef4444" }}>(Overdue)</span>}</p>
              {caseData.slaRemainingHours < 4 && <p style={{ color: "#f97316" }}>Escalation warning!</p>}
            </section>

            {/* collaboration */}
            <section style={{ background: "#0b1220", padding: 12, borderRadius: 6, marginBottom: 20 }}>
              <h2>Discussion</h2>
              <div style={{ maxHeight: 120, overflowY: "auto", background: "#111827", padding: 8, borderRadius: 4 }}>
                {discussion.map((msg, idx) => <div key={idx}>{msg}</div>)}
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ width: "100%", marginTop: 8 }}
                placeholder="Add note..."
              />
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", cursor:"pointer" }}>
                <button
                  style={{ ...buttonBaseStyle, flex: 1, minWidth: 120 }}
                  onClick={async () => {
                    if (newMessage.trim() && caseData) {
                      await amlAPI.postCaseDiscussion(caseData.id, newMessage.trim());
                      setDiscussion([...discussion, `You: ${newMessage.trim()}`]);
                      setNewMessage("");
                    }
                  }}
                >
                  Post
                </button>
                <button
                  style={{
                    ...buttonBaseStyle,
                    flex: 1,
                    minWidth: 160,
                    opacity: (!caseData || caseData.status === "escalated" || caseData.status === "strSubmitted" || caseData.status === "closed") ? 0.5 : 1,
                  }}
                  disabled={!caseData || caseData.status === "escalated" || caseData.status === "strSubmitted" || caseData.status === "closed" }
                  onClick={async () => {
                    if (!caseData) return;
                    try {
                      await updateStatus("escalated");
                      setCaseData({
                        ...caseData,
                        status: "escalated",
                        escalationLevel: caseData.escalationLevel + 1,
                      });
                      setDiscussion([...discussion, "System: Escalated to STR module."]);
                    } catch (err) {
                      console.error(err);
                      alert("Failed to escalate case. See console for details.");
                    }
                  }}
                >
                  Escalate to STR
                </button>
              </div>

              <h3>Attachments</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {attachments.map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{a}</span>
                    <button
                      style={{
                        ...buttonBaseStyle,
                        fontSize: 12,
                        padding: "2px 6px",
                      }}
                      onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAttachments([...attachments, file.name]);
                    }
                    // Clear so same file can be selected again
                    e.target.value = "";
                  }}
                />
                <button
                  style={{
                    cursor: "pointer",
                    border: "1px solid white",
                    borderRadius: 4,
                    background: "transparent",
                    padding: "6px 10px",
                    color: "#f9fafb",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload document
                </button>
              </div>

              <h3>Tags</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "#1f2937",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {tag}
                    <button
                      style={{ fontSize: 10, padding: "2px 4px", cursor: "pointer" }}
                      onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag"
                  style={{ flex: 1, padding: 6, background: "#111827", color: "#f9fafb", border: "1px solid #334155", borderRadius: 4 }}
                />
                <button
                  style={buttonBaseStyle}
                  onClick={() => {
                    const tag = newTag.trim();
                    if (tag) {
                      setTags([...tags, tag]);
                      setNewTag("");
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </section>

            {/* audit timeline */}
            <section style={{ background: "#0b1220", padding: 12, borderRadius: 6 }}>
              <h2>Audit Timeline</h2>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {audit.length ? audit.map((e, i) => <div key={i}>{e}</div>) : '[status changes / activity log with timestamps & IPs]'}
              </div>
            </section>
          </div>
        </div>
      )}

      {!caseData && <div>Loading case...</div>}
    </div>
  );
}