"use client";

import React, { useState } from "react";
import {
    AlertResponse,
    amlAPI,
} from "../../AML_frontend/services/api";

// simple augmentation of alert type for management UI
interface ManagedAlert extends AlertResponse {
    customerName: string;
    riskScore: number; // 0-100
    amount: number;
    ruleTriggered: string;
    detectionSource: "edge" | "core";
    lifecycleStage: "new" | "underReview" | "escalated" | "closed";
    slaRemainingHours: number;
    institution?: string;
}

export default function AlertManagement() {
    const [alerts, setAlerts] = useState<ManagedAlert[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        dateFrom: "",
        dateTo: "",
        riskLevel: "",
        lifecycleStage: "",
        detectionSource: "",
        institution: "",
        amountMin: "",
        amountMax: "",
    });

    // fetch alerts from backend whenever filters change
    React.useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const resp = await amlAPI.getAlerts(1, 50, {
                    severity: filters.riskLevel,
                    detectionType: filters.detectionSource,
                    lifecycleStage: filters.lifecycleStage,
                    institution: filters.institution,
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo,
                    amountMin: filters.amountMin,
                    amountMax: filters.amountMax,
                });
                const mapped: ManagedAlert[] = resp.alerts.map((a): ManagedAlert => ({
                    ...a,
                    customerName: a.institution || "--",
                    riskScore: a.severity === 'critical' ? 90 : a.severity === 'high' ? 70 : a.severity === 'medium' ? 50 : 20,
                    amount: Math.floor(Math.random() * 10000),
                    ruleTriggered: "N/A",
                    detectionSource: a.detectionType as "edge" | "core",
                    lifecycleStage: (a as any).lifecycleStage || 'new',
                    slaRemainingHours: a.slsRemaining,
                }));
                setAlerts(mapped);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [filters]);
    const [selectedAlert, setSelectedAlert] = useState<ManagedAlert | null>(null);
    const [showTransitionModal, setShowTransitionModal] = useState(false);
    const [pendingTransition, setPendingTransition] = useState<string>("");

    // filter handler updates state
    const updateFilter = (key: string, value: string) => {
        setFilters((f) => ({ ...f, [key]: value }));
    };

    // open confirmation modal before lifecycle transition
    const requestTransition = (alert: ManagedAlert, targetStage: string) => {
        setSelectedAlert(alert);
        setPendingTransition(targetStage);
        setShowTransitionModal(true);
    };

    const confirmTransition = async () => {
        if (selectedAlert) {
            try {
                await amlAPI.updateAlertLifecycle(selectedAlert.id, pendingTransition);
                // update local state after successful patch
                selectedAlert.lifecycleStage = pendingTransition as any;
                setAlerts([...alerts]);
            } catch (err) {
                console.error("failed to update alert", err);
            }
        }
        setShowTransitionModal(false);
        setPendingTransition("");
    };

    return (
        <div style={{ padding: 20, fontFamily: "Inter, sans-serif", color: "#e5e7eb" }}>
            <h1 style={{ fontSize: 24, marginBottom: 16 }}>Alert Management</h1>

            {/* filter section */}
            <section style={{ marginBottom: 20, background: "#0b1220", padding: 12, borderRadius: 6 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <input type="date" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} placeholder="From" style={{ padding: 6, borderRadius: 4 }} />
                    <input type="date" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} placeholder="To" style={{ padding: 6, borderRadius: 4 }} />
                    <select value={filters.riskLevel} onChange={(e) => updateFilter("riskLevel", e.target.value)} style={{ padding: 6, borderRadius: 4, background: "#0b1220" }}>
                        <option value="">All risk</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                    <select value={filters.lifecycleStage} onChange={(e) => updateFilter("lifecycleStage", e.target.value)} style={{ padding: 6, borderRadius: 4, background: "#0b1220" }}>
                        <option value="">Any stage</option>
                        <option value="new">New</option>
                        <option value="underReview">Under review</option>
                        <option value="escalated">Escalated</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select value={filters.detectionSource} onChange={(e) => updateFilter("detectionSource", e.target.value)} style={{ padding: 6, borderRadius: 4, background: "#0b1220" }}>
                        <option value="">All sources</option>
                        <option value="edge">Edge</option>
                        <option value="core">Core</option>
                    </select>
                    <input type="text" value={filters.institution} onChange={(e) => updateFilter("institution", e.target.value)} placeholder="Institution" style={{ padding: 6, borderRadius: 4 }} />
                    <input
                        type="number"
                        value={filters.amountMin}
                        onChange={(e) => updateFilter("amountMin", e.target.value)}
                        placeholder="Min amount"
                        className="whitePlaceholder"
                        style={{ padding: 6, borderRadius: 4, background: "white" }}
                    />
                    <input
                        type="number"
                        value={filters.amountMax}
                        onChange={(e) => updateFilter("amountMax", e.target.value)}
                        placeholder="Max amount"
                        className="whitePlaceholder"
                        style={{ padding: 6, borderRadius: 4, background: "white" }}
                    />
                </div>
            </section>

            <style jsx>{`
                .whitePlaceholder::placeholder {
                    color: black;
                }
            `}</style>

            {/* alerts table */}
            {loading ? (
                <div>Loading alerts...</div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                        <th>Alert ID</th>
                        <th>Customer</th>
                        <th>Risk</th>
                        <th>Amount</th>
                        <th>Rule</th>
                        <th>Source</th>
                        <th>Severity</th>
                        <th>Stage</th>
                        <th>SLA</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {alerts.map((a) => (
                        <tr key={a.id} style={{ borderBottom: "1px solid #222" }}>
                            <td>{a.id}</td>
                            <td>{a.customerName}</td>
                            <td>
                                {a.riskScore}
                                <div style={{ width: 50, height: 8, background: `linear-gradient(to right, red ${a.riskScore}%, green ${a.riskScore}%)` }} />
                            </td>
                            <td>{a.amount.toLocaleString()}</td>
                            <td>{a.ruleTriggered}</td>
                            <td>{a.detectionSource}</td>
                            <td>{a.severity}</td>
                            <td>{a.lifecycleStage}</td>
                            <td>{a.slaRemainingHours}h</td>
                            <td>
                                <button onClick={() => requestTransition(a, "underReview")} disabled={a.lifecycleStage !== "new"} style={{ marginRight: 4 }}>
                                    Review
                                </button>
                                <button onClick={() => requestTransition(a, "escalated")} disabled={a.lifecycleStage === "closed"} style={{ marginRight: 4 }}>
                                    Escalate
                                </button>
                                <button onClick={() => setSelectedAlert(a)} style={{ marginRight: 4 }}>
                                    Details
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                </table>
            )}   

            {/* confirmation modal */}
            {showTransitionModal && selectedAlert && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ background: "#0b1220", padding: 20, borderRadius: 6, width: 400 }}>
                        <h2>Confirm transition</h2>
                        <p>Change alert <strong>{selectedAlert.id}</strong> to <strong>{pendingTransition}</strong>?</p>
                        <button onClick={confirmTransition} style={{ marginRight: 8 }}>Confirm</button>
                        <button onClick={() => setShowTransitionModal(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* investigation panel */}
            {selectedAlert && (
                <aside style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 320, background: "#111827", padding: 12, overflowY: "auto" }}>
                    <h2>Investigation</h2>
                    <div>
                        <strong>Notes</strong>
                        <textarea style={{ width: "100%", height: 100, marginTop: 4 }} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <strong>Timeline</strong>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>[activity log here]</div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <strong>Related alerts</strong>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>--none--</div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <strong>Linked accounts</strong>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>--none--</div>
                    </div>
                    <button style={{ marginTop: 20 }} onClick={() => setSelectedAlert(null)}>Close</button>
                </aside>
            )}
        </div>
    );
}