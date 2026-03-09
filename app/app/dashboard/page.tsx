"use client";

import React, { useEffect, useState } from "react";
// correct relative path to shared API service and export types
import {
    amlAPI,
    useAsync,
    AlertResponse,
    KPIResponse,
    AlertsListResponse,
    RealTimeIndicatorsResponse,
    HeatmapDataResponse,
    TrendDataResponse,
    AlertLifecycleResponse,
    InstitutionRiskResponse,
} from "../../../AML_frontend/services/api";

type Role = "bank" | "regulator" | "admin";

function severityColor(s: string) {
	switch (s) {
		case "critical":
			return "#b91c1c"; // red
		case "high":
			return "#ea580c"; // orange
		case "medium":
			return "#f59e0b"; // amber
		default:
			return "#10b981"; // green
	}
}

export default function Dashboard() {
	const [role, setRole] = useState<Role>("bank");
    const [lastUpdate, setLastUpdate] = useState<string>("");
	// add explicit generics so returned data is correctly typed
	const kpi = useAsync<KPIResponse>(() => amlAPI.getKPISummary());
	const topAlerts = useAsync<AlertsListResponse>(() => amlAPI.getTopAlerts(5));
	const realtime = useAsync<RealTimeIndicatorsResponse>(() => amlAPI.getRealTimeIndicators());
	const heatmap = useAsync<HeatmapDataResponse>(() => amlAPI.getHeatmapData());
	const trend = useAsync<TrendDataResponse>(() => amlAPI.getTrendData("24h"));
	const lifecycle = useAsync<AlertLifecycleResponse>(() => amlAPI.getAlertLifecycle());
	const institutionRisk = useAsync<InstitutionRiskResponse>(() => amlAPI.getInstitutionRisk());

	// Poll realtime indicators every 10s
	useEffect(() => {
		const iv = setInterval(() => {
			realtime.refetch();
		}, 10000);
		return () => clearInterval(iv);
	}, []);

	// set initial backend update time once on client
	useEffect(() => {
		setLastUpdate(new Date().toLocaleTimeString());
	}, []);

	// Small helper renderers
	const renderKPI = () => {
		if (kpi.loading) return <div>Loading KPIs...</div>;
		if (kpi.error) return <div className="text-red-600">{kpi.error}</div>;
		if (!kpi.data) return <div>No KPI data</div>;

		const d = kpi.data;

		return (
			<div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
				<div style={{ padding: 12, background: "#111827", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>Total Transactions Today</div>
					<div style={{ fontSize: 20, fontWeight: 700 }}>{d.totalTransactions.toLocaleString()}</div>
				</div>

				<div style={{ padding: 12, background: "#111827", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>Total Alerts</div>
					<div style={{ fontSize: 20, fontWeight: 700 }}>{d.totalAlerts}</div>
					<div style={{ marginTop: 6, fontSize: 12 }}>
						<span style={{ color: "#60a5fa" }}>New {d.alertSegmentation.new}</span>
						<span style={{ marginLeft: 8, color: "#f59e0b" }}>Under Review {d.alertSegmentation.underReview}</span>
						<span style={{ marginLeft: 8, color: "#ef4444" }}>Escalated {d.alertSegmentation.escalated}</span>
					</div>
				</div>

				<div style={{ padding: 12, background: "#111827", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>Overdue Cases</div>
					<div style={{ fontSize: 20, fontWeight: 700, color: d.overdueCases ? "#ef4444" : "#10b981" }}>{d.overdueCases}</div>
					<div style={{ fontSize: 12, marginTop: 6, color:"white" }}>SLA: {d.slaCountdown }</div>
				</div>
				<div style={{ padding: 12, background: "#111827", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>STR Submitted Today</div>
					<div style={{ fontSize: 20, fontWeight: 700 }}>{d.strSubmittedToday}</div>
				</div>

				<div style={{ padding: 12, background: "#111827", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>Edge vs Core Detection</div>
					<div style={{ fontSize: 20, fontWeight: 700 }}>{d.edgeDetection}:{d.coreDetection}</div>
				</div>

				<div style={{ padding: 12, background: "#111827", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>Pending Regulatory Reviews</div>
					<div style={{ fontSize: 20, fontWeight: 700 }}>{d.pendingRegulatoryReviews}</div>
				</div>
			</div>
		);
	};

	const renderTopAlerts = () => {
		if (topAlerts.loading) return <div>Loading alerts...</div>;
		if (topAlerts.error) return <div className="text-red-600">{topAlerts.error}</div>;
		if (!topAlerts.data || !topAlerts.data.alerts.length) return <div>No high-risk alerts</div>;

		return (
			<div>
				{topAlerts.data.alerts.map((a: AlertResponse) => (
					<div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid #111827" }}>
						<div>
							<div style={{ fontWeight: 700 }}>{a.title}</div>
							<div style={{ fontSize: 12, opacity: 0.8 }}>{a.institution} • {new Date(a.timestamp).toUTCString()}</div>
						</div>
						<div style={{ textAlign: "right" }}>
							<div style={{ color: severityColor(a.severity), fontWeight: 700 }}>{a.severity.toUpperCase()}</div>
							<div style={{ fontSize: 12 }}>{a.slsRemaining}h SLA</div>
						</div>
					</div>
				))}
			</div>
		);
	};

	const renderRealtimeIndicators = () => {
		if (realtime.loading) return <div>Loading indicators...</div>;
		if (realtime.error) return <div className="text-red-600">{realtime.error}</div>;
		if (!realtime.data) return <div>No indicators</div>;

		const r = realtime.data;
		return (
			<div style={{ display: "flex", gap: 12 }}>
				<div style={{ padding: 8, background: "#0f172a", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>Live Notifications</div>
					<div style={{ fontWeight: 700, fontSize: 18 }}>{r.liveNotifications}</div>
				</div>
				<div style={{ padding: 8, background: "#0f172a", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>Edge Detections</div>
					<div style={{ fontWeight: 700, fontSize: 18 }}>{r.edgeDetectionCount}</div>
				</div>
				<div style={{ padding: 8, background: "#0f172a", color: "white", borderRadius: 6 }}>
					<div style={{ fontSize: 12, opacity: 0.8 }}>Backend Detections</div>
					<div style={{ fontWeight: 700, fontSize: 18 }}>{r.coreDetectionCount}</div>
				</div>
			</div>
		);
	};

	return (
		<div style={{ padding: 20, color: "#e5e7eb", fontFamily: "Inter, sans-serif" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<div>
					<h1 style={{ margin: 0, fontSize: 22 }}>AML Dashboard</h1>
					<div style={{ fontSize: 12, opacity: 0.7 }}>Enforcement-focused view — prioritizes compliance and risk visibility</div>
				</div>

				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<div style={{ background: "#ef4444", color: "white", padding: "6px 10px", borderRadius: 20 }}>Live</div>
					<select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ padding: 8, borderRadius: 6, background: "#0b1220", color: "white" }}>
						<option value="bank">Bank</option>
						<option value="regulator">Regulator</option>
						<option value="admin">Admin</option>
					</select>
				</div>
			</div>

			<section style={{ marginBottom: 20 }}>{renderKPI()}</section>

			<section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
				<div style={{ padding: 12, background: "#0b1220", borderRadius: 6 }}>
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
						<strong>Visual Analytics</strong>
						<div style={{ fontSize: 12, opacity: 0.7 }}>National Risk Heatmap • Trend • Lifecycle</div>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
						<div style={{ minHeight: 160, background: "#071025", borderRadius: 6, padding: 8 }}>
							<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>National Risk Heatmap</div>
							<div style={{ height: 110, background: "linear-gradient(90deg,#060b10,#112131)", borderRadius: 6 }}>
								{/* placeholder heatmap: map would go here */}
								<div style={{ padding: 8, color: "#cbd5e1" }}>Heatmap placeholder — fetches regions from API</div>
							</div>
						</div>

						<div style={{ minHeight: 160, background: "#071025", borderRadius: 6, padding: 8 }}>
							<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Suspicious Activity Trend (24h)</div>
							<div style={{ height: 110 }}>
								{/* Simple inline sparkline based on trend.data if available */}
								{trend.data && trend.data.data ? (
									<svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: "100%", height: 110 }}>
										{(() => {
											const pts = trend.data!.data.map((p, i) => {
												const x = (i / Math.max(1, trend.data!.data.length - 1)) * 100;
												const max = Math.max(...trend.data!.data.map((d) => d.alerts));
												const y = 30 - (p.alerts / Math.max(1, max)) * 28;
												return `${x},${y}`;
											});
											return <polyline fill="none" stroke="#60a5fa" strokeWidth={2} points={pts.join(" ")} />;
										})()}
									</svg>
								) : (
									<div style={{ color: "#94a3b8" }}>Trend chart placeholder</div>
								)}
							</div>
						</div>

						<div style={{ gridColumn: "1 / span 2", minHeight: 120, background: "#071025", borderRadius: 6, padding: 8 }}>
							<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Alert Lifecycle Distribution</div>
							<div style={{ display: "flex", gap: 8 }}>
								{lifecycle.data ? (
									Object.entries(lifecycle.data as AlertLifecycleResponse)
								.map(([k, v]: [string, number]) => (
										<div key={k} style={{ flex: 1, padding: 8, background: "#06121a", borderRadius: 6 }}>
											<div style={{ fontSize: 12, opacity: 0.7 }}>{k}</div>
											<div style={{ fontWeight: 700, fontSize: 18 }}>{v}</div>
										</div>
									))
								) : (
									<div style={{ color: "#94a3b8" }}>Lifecycle placeholder</div>
								)}
							</div>
						</div>
					</div>
				</div>

				<aside style={{ padding: 12, background: "#071025", borderRadius: 6 }}>
					<div style={{ fontWeight: 700, marginBottom: 8 }}>Alert Priority Panel</div>
					<div style={{ marginBottom: 12 }}>
						<div style={{ fontSize: 12, opacity: 0.7 }}>Top 5 High-Risk Alerts</div>
						<div style={{ marginTop: 8 }}>{renderTopAlerts()}</div>
					</div>

					<div style={{ marginTop: 12 }}>
						<div style={{ fontSize: 12, opacity: 0.7 }}>Alerts Approaching SLA</div>
						{/* <div style={{ marginTop: 8, color: "#f97316" }}>-- placeholder (fetch with /alerts?sortBy=slsRemaining)</div> */}
					</div>

					<div style={{ marginTop: 12 }}>
						<div style={{ fontSize: 12, opacity: 0.7 }}>Recently Escalated</div>
						{/* <div style={{ marginTop: 8, color: "#ef4444" }}>-- placeholder</div> */}
					</div>
				</aside>
			</section>

			<section style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
				<div style={{ padding: 12, background: "#071025", borderRadius: 6 }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<strong>Institution Risk Ranking</strong>
						<div style={{ fontSize: 12, opacity: 0.7 }}>For regulator role</div>
					</div>

					<div style={{ marginTop: 8 }}>
						{role !== "regulator" ? (
							<div style={{ color: "#94a3b8" }}>Switch to Regulator view to see ranking</div>
						) : institutionRisk.loading ? (
							<div>Loading ranking...</div>
						) : institutionRisk.error ? (
							<div style={{ color: "#ef4444" }}>{institutionRisk.error}</div>
						) : institutionRisk.data ? (
							<ol style={{ marginTop: 8 }}>
								{institutionRisk.data.data.map((ins, i) => (
									<li key={ins.institution} style={{ padding: 6, background: i < 3 ? "#2b1220" : "transparent", marginBottom: 6, borderRadius: 4 }}>
										<div style={{ display: "flex", justifyContent: "space-between" }}>
											<div>{i + 1}. {ins.institution}</div>
											<div style={{ color: ins.riskScore > 75 ? "#ef4444" : ins.riskScore > 50 ? "#f59e0b" : "#10b981" }}>{ins.riskScore}</div>
										</div>
									</li>
								))}
							</ol>
						) : (
							<div style={{ color: "#94a3b8" }}>No ranking data</div>
						)}
					</div>
				</div>

				<div style={{ padding: 12, background: "#071025", borderRadius: 6 }}>
					<div style={{ fontWeight: 700, marginBottom: 8 }}>Real-time Indicators</div>
					{renderRealtimeIndicators()}

					<div style={{ marginTop: 12 }}>
						<div style={{ fontSize: 12, opacity: 0.7 }}>Backend</div>
						<div style={{ fontSize: 12, opacity: 0.7 }}>Last update: {lastUpdate || "--"}</div>
					</div>
				</div>
			</section>
		</div>
	);
}

