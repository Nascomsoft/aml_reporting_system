"use client";

import React, { useEffect, useState } from "react";
import {
  amlAPI,
  useAsync,
  AlertResponse,
  AlertsListResponse,
  RealTimeIndicatorsResponse,
  HeatmapDataResponse,
  TrendDataResponse,
  AlertLifecycleResponse,
  BankDashboardResponse,
} from "../../../AML_frontend/services/api";

function severityColor(s: string) {
  switch (s) {
    case "critical":
      return "#b91c1c";
    case "high":
      return "#ea580c";
    case "medium":
      return "#f59e0b";
    default:
      return "#10b981";
  }
}

function riskColor(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 50) return "#f59e0b";
  return "#10b981";
}

export default function OfficerDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  // Data fetching with proper role-based Auth
  const bankDashboard = useAsync<BankDashboardResponse>(() => amlAPI.getBankDashboard());
  const topAlerts = useAsync<AlertsListResponse>(() => amlAPI.getTopAlerts(5));
  const realtime = useAsync<RealTimeIndicatorsResponse>(() => amlAPI.getRealTimeIndicators());
  const heatmap = useAsync<HeatmapDataResponse>(() => amlAPI.getHeatmapData());
  const trend = useAsync<TrendDataResponse>(
    () => amlAPI.getTrendData(selectedTimeRange),
    true,
    [selectedTimeRange]
  );
  const lifecycle = useAsync<AlertLifecycleResponse>(() => amlAPI.getAlertLifecycle());
  const refetchRealtime = realtime.refetch;

  // Refresh realtime indicators every 30 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      void refetchRealtime();
    }, 30000);
    return () => clearInterval(iv);
  }, [refetchRealtime]);

  // Render KPI metrics (officer-specific: branches, cases, escalation)
  const renderKPIMetrics = () => {
    if (bankDashboard.loading) return <div style={{ color: "#94a3b8" }}>Loading metrics...</div>;
    if (bankDashboard.error) return <div style={{ color: "#ef4444" }}>Error: {bankDashboard.error}</div>;
    if (!bankDashboard.data) return null;

    const data = bankDashboard.data;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div style={{ padding: 12, background: "#0b1220", borderRadius: 6, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Branches Monitored</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.branchesMonitored}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Across your institution</div>
        </div>

        <div style={{ padding: 12, background: "#0b1220", borderRadius: 6, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Branches Requiring Attention</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: data.branchesRequiringAttention > 0 ? "#f59e0b" : "#10b981" }}>
            {data.branchesRequiringAttention}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Risk score ≥ 70</div>
        </div>

        <div style={{ padding: 12, background: "#0b1220", borderRadius: 6, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Cases Under Review</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.casesUnderReview}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Active investigations</div>
        </div>

        <div style={{ padding: 12, background: "#0b1220", borderRadius: 6, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Cases Pending Escalation</div>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            marginTop: 4,
            color: data.casesPendingEscalation > 0 ? "#ef4444" : "#10b981"
          }}>
            {data.casesPendingEscalation}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>SLA ≤ 8 hours</div>
        </div>
      </div>
    );
  };

  // Render top alerts with severity colors
  const renderTopAlerts = () => {
    if (topAlerts.loading) return <div style={{ color: "#94a3b8" }}>Loading alerts...</div>;
    if (topAlerts.error) return <div style={{ color: "#ef4444" }}>Error: {topAlerts.error}</div>;
    if (!topAlerts.data || !topAlerts.data.alerts.length) return <div style={{ color: "#94a3b8" }}>No high-risk alerts</div>;

    return (
      <div>
        {topAlerts.data.alerts.slice(0, 5).map((a: AlertResponse) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 8,
              borderBottom: "1px solid #1e293b",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                {a.institution || "Unknown"} • {new Date(a.timestamp).toLocaleDateString()}
              </div>
            </div>
            <div style={{ textAlign: "right", marginLeft: 12 }}>
              <div style={{ color: severityColor(a.severity), fontWeight: 700, fontSize: 12 }}>
                {a.severity.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{a.slsRemaining}h SLA</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render real-time indicators
  const renderRealtimeIndicators = () => {
    if (realtime.loading) return <div style={{ color: "#94a3b8" }}>Loading...</div>;
    if (realtime.error) return <div style={{ color: "#ef4444" }}>Error</div>;
    if (!realtime.data) return null;

    const r = realtime.data;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <div style={{ padding: 8, background: "#0f172a", borderRadius: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Active Alerts</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{r.liveNotifications}</div>
        </div>
        <div style={{ padding: 8, background: "#0f172a", borderRadius: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Rule-Based Detections</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{r.ruleBasedDetectionCount}</div>
        </div>
        <div style={{ padding: 8, background: "#0f172a", borderRadius: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Recently Escalated</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{r.recentlyEscalated}</div>
        </div>
      </div>
    );
  };

  // Render alert lifecycle breakdown
  const renderAlertLifecycle = () => {
    if (lifecycle.loading) return <div style={{ color: "#94a3b8" }}>Loading...</div>;
    if (lifecycle.error) return <div style={{ color: "#ef4444" }}>Error</div>;
    if (!lifecycle.data) return null;

    const stages = [
      { key: "new", label: "New", color: "#60a5fa" },
      { key: "underReview", label: "Under Review", color: "#f59e0b" },
      { key: "escalated", label: "Escalated", color: "#ef4444" },
      { key: "strSubmitted", label: "STR Submitted", color: "#8b5cf6" },
      { key: "closed", label: "Closed", color: "#10b981" },
    ];

    const maxValue = Math.max(...Object.values(lifecycle.data as unknown as Record<string, number>));

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {stages.map(({ key, label, color }) => {
          const value = (lifecycle.data as unknown as Record<string, number>)[key] ?? 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div key={key}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>{label}</div>
              <div
                style={{
                  height: 120,
                  background: "#0f172a",
                  borderRadius: 6,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: 8,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: `${percentage}%`,
                    background: color,
                    borderRadius: 4,
                    minHeight: percentage > 0 ? 4 : 0,
                  }}
                />
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{value}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render heatmap (regional risk)
  const renderHeatmap = () => {
    if (heatmap.loading) return <div style={{ color: "#94a3b8" }}>Loading heatmap...</div>;
    if (heatmap.error) return <div style={{ color: "#ef4444" }}>Error</div>;
    if (!heatmap.data || !heatmap.data.data.length) return <div style={{ color: "#94a3b8" }}>No data</div>;

    const maxRisk = Math.max(...heatmap.data.data.map((d) => d.riskScore));

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {heatmap.data.data.map((region) => {
          const normalized = (region.riskScore / maxRisk) * 100;
          return (
            <div
              key={region.region}
              style={{
                padding: 12,
                background: "#0f172a",
                borderRadius: 6,
                border: `2px solid ${riskColor(region.riskScore)}`,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{region.region}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: riskColor(region.riskScore) }}>
                {region.riskScore}
              </div>
              <div
                style={{
                  height: 4,
                  background: "#1e293b",
                  borderRadius: 2,
                  marginTop: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${normalized}%`,
                    background: riskColor(region.riskScore),
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render trends with time range selector
  const renderTrends = () => {
    if (trend.loading) return <div style={{ color: "#94a3b8" }}>Loading trends...</div>;
    if (trend.error) return <div style={{ color: "#ef4444" }}>Error</div>;
    if (!trend.data || !trend.data.data.length) return <div style={{ color: "#94a3b8" }}>No data</div>;

    const maxAlerts = Math.max(...trend.data.data.map((d) => d.alerts));

    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["24h", "7d", "30d"].map((range) => (
            <button
              key={range}
              onClick={() => {
                setSelectedTimeRange(range as "24h" | "7d" | "30d");
                trend.refetch();
              }}
              style={{
                padding: "6px 12px",
                background: selectedTimeRange === range ? "#0284c7" : "#0f172a",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {range}
            </button>
          ))}
        </div>
        <div style={{ height: 200, position: "relative" }}>
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`grid-${i}`}
                x1="0"
                y1={i * 7.5}
                x2="100"
                y2={i * 7.5}
                stroke="#1e293b"
                strokeWidth="0.3"
              />
            ))}
            {/* Trend line */}
            {(() => {
              const pts = trend.data!.data.map((p, i) => {
                const x = (i / Math.max(1, trend.data!.data.length - 1)) * 100;
                const y = 30 - (p.alerts / Math.max(1, maxAlerts)) * 28;
                return `${x},${y}`;
              });
              return (
                <>
                  <polyline fill="none" stroke="#0284c7" strokeWidth={1.5} points={pts.join(" ")} />
                  <polyline
                    fill="url(#gradient)"
                    points={`0,30 ${pts.join(" ")} 100,30`}
                    opacity="0.3"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </>
              );
            })()}
          </svg>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginTop: 12 }}>
          {trend.data.data.map((point, i) => (
            <div key={i} style={{ fontSize: 10, opacity: 0.6, textAlign: "center" }}>
              <div style={{ fontWeight: 600 }}>{point.alerts}</div>
              <div style={{ fontSize: 9 }}>{new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 20, background: "#0b1220", color: "#e5e7eb", fontFamily: "system-ui, sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 700 }}>Compliance Officer Dashboard</h1>
        <div style={{ fontSize: 14, opacity: 0.7 }}>Real-time AML monitoring and alert management</div>
        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}><span style={{ color: "#10b981" }}>●</span> Live</div>
      </div>

      {/* KPI Metrics */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginBottom: 12 }}>Key Metrics</h2>
        {renderKPIMetrics()}
      </section>

      {/* Main Analytics Grid */}
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Left Column: Charts */}
        <div style={{ display: "grid", gridTemplateRows: "auto auto auto", gap: 20 }}>
          {/* Alert Lifecycle */}
          <div style={{ padding: 16, background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Alert Lifecycle Distribution</h3>
            {renderAlertLifecycle()}
          </div>

          {/* Regional Risk Heatmap */}
          <div style={{ padding: 16, background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Regional Risk Heatmap</h3>
            {renderHeatmap()}
          </div>

          {/* Trends */}
          <div style={{ padding: 16, background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Suspicious Activity Trends</h3>
            {renderTrends()}
          </div>
        </div>

        {/* Right Column: Alerts & Indicators */}
        <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 20 }}>
          {/* Top Alerts */}
          <div style={{ padding: 16, background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Priority Alerts</h3>
            {renderTopAlerts()}
          </div>

          {/* Real-time Indicators */}
          <div style={{ padding: 16, background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Real-time Indicators</h3>
            {renderRealtimeIndicators()}
          </div>
        </div>
      </section>
    </div>
  );
}
