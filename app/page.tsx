"use client";

import React, { useEffect, useState } from "react";
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
} from "../AML_frontend/services/api";
import {
  Card,
  KPICard,
  Badge,
  AlertBanner,
  Table,
  Button,
} from "@/components";
import {
  formatNGN,
  formatDateTimeNG,
  formatNumberShort,
  AML_RISK_LEVELS,
} from "@/lib/localization";

type Role = "bank" | "regulator" | "admin";

interface RiskMetrics {
  level: "low" | "medium" | "high" | "critical";
  color: string;
  label: string;
}

function getRiskMetrics(severity: string): RiskMetrics {
  switch (severity) {
    case "critical":
      return { level: "critical", color: "#dc2626", label: "Critical" };
    case "high":
      return { level: "high", color: "#ea580c", label: "High" };
    case "medium":
      return { level: "medium", color: "#f59e0b", label: "Medium" };
    default:
      return { level: "low", color: "#16a34a", label: "Low" };
  }
}

export default function Dashboard() {
  const [role, setRole] = useState<Role>("bank");
  const [expandedView, setExpandedView] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertResponse | null>(null);

  // API Calls
  const kpi = useAsync<KPIResponse>(() => amlAPI.getKPISummary());
  const topAlerts = useAsync<AlertsListResponse>(() =>
    amlAPI.getTopAlerts(10)
  );
  const realtime = useAsync<RealTimeIndicatorsResponse>(() =>
    amlAPI.getRealTimeIndicators()
  );
  const heatmap = useAsync<HeatmapDataResponse>(() => amlAPI.getHeatmapData());
  const trend = useAsync<TrendDataResponse>(() => amlAPI.getTrendData("24h"));
  const lifecycle = useAsync<AlertLifecycleResponse>(() =>
    amlAPI.getAlertLifecycle()
  );
  const institutionRisk = useAsync<InstitutionRiskResponse>(() =>
    amlAPI.getInstitutionRisk()
  );

  // Realtime polling
  useEffect(() => {
    const iv = setInterval(() => {
      realtime.refetch();
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  // Critical alerts (severity = critical)
  const criticalAlerts =
    topAlerts.data?.alerts.filter((a) => a.severity === "critical") || [];
  const hasCriticalAlerts = criticalAlerts.length > 0;

  // Role-specific KPIs
  const getRoleKPIs = () => {
    if (!kpi.data) return [];

    const baseKPIs = [
      {
        title: "Alert Volume",
        value: kpi.data.totalAlerts,
        icon: "📊",
        subtext: `${kpi.data.alertSegmentation.new} new`,
        trend: undefined,
      },
      {
        title: "Overdue Cases",
        value: kpi.data.overdueCases,
        icon: "⏰",
        subtext: kpi.data.slaCountdown,
        trend:
          kpi.data.overdueCases > 0
            ? { direction: "up" as const, value: kpi.data.overdueCases, label: "SLA risk" }
            : undefined,
      },
      {
        title: "STR Submitted",
        value: kpi.data.strSubmittedToday,
        icon: "📝",
        subtext: "Today",
        trend: undefined,
      },
    ];

    if (role === "bank") {
      return [
        ...baseKPIs,
        {
          title: "Transactions",
          value: formatNumberShort(kpi.data.totalTransactions),
          icon: "💳",
          subtext: "Today",
          trend: undefined,
        },
      ];
    } else if (role === "regulator") {
      return [
        ...baseKPIs,
        {
          title: "Regulatory Reviews",
          value: kpi.data.pendingRegulatoryReviews,
          icon: "✓",
          subtext: "Pending",
          trend: undefined,
        },
      ];
    } else {
      // admin
      return [
        ...baseKPIs,
        {
          title: "Active Rules",
          value: 42,
          icon: "⚙️",
          subtext: "In system",
          trend: undefined,
        },
      ];
    }
  };

  const roleLabel =
    role === "bank"
      ? "🏦 Bank Officer"
      : role === "regulator"
        ? "📋 Regulator"
        : "⚙️ Administrator";

  return (
    <div className="p-8 space-y-8">
      {/* Header with Role Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2 text-primary m-0">AML Monitoring Dashboard</h1>
          <p className="text-text-secondary text-base mt-2">
            Real-time view of alerts, cases, and regulatory submissions for Nigeria
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-bg-secondary px-4 py-2 rounded-lg border border-border-default">
            <span className="text-xl">👁️</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="bg-transparent text-primary font-semibold border-none outline-none cursor-pointer"
            >
              <option value="bank">🏦 Bank Officer</option>
              <option value="regulator">📋 Regulator</option>
              <option value="admin">⚙️ Administrator</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-danger-100 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-danger-600 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-danger-900">Live</span>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {hasCriticalAlerts && (
        <AlertBanner
          type="danger"
          title={`⚠️ ${criticalAlerts.length} Critical Alert${criticalAlerts.length > 1 ? "s" : ""} Require Immediate Action`}
          message={`Highest risk: ${criticalAlerts[0].title}`}
          action={{
            label: "View Alert Management",
            onClick: () => {
              // Navigate to alert management
              window.location.href = "/alert_management";
            },
          }}
        />
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpi.loading ? (
          <p className="text-text-secondary">Loading KPIs...</p>
        ) : kpi.error ? (
          <AlertBanner type="danger" message={kpi.error} />
        ) : (
          getRoleKPIs().map((kpiItem, idx) => (
            <KPICard
              key={idx}
              title={kpiItem.title}
              value={kpiItem.value}
              icon={kpiItem.icon}
              subtext={kpiItem.subtext}
              trend={kpiItem.trend}
              onClick={() => setExpandedView(!expandedView)}
            />
          ))
        )}
      </div>

      {/* Main Grid: Alerts + Analytics + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Top Alerts Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Critical Alerts Section */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h5 className="heading-5 text-primary m-0">Critical Alerts</h5>
              <Button size="sm" variant="ghost">
                View All
              </Button>
            </div>
            {criticalAlerts.length > 0 ? (
              <div className="space-y-3">
                {criticalAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 bg-danger-100 border border-danger-300 rounded-lg cursor-pointer hover:bg-danger-200 transition-colors"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-danger-900">
                          {alert.title}
                        </p>
                        <p className="text-sm text-danger-800 mt-1">
                          {alert.institution} •{" "}
                          {formatDateTimeNG(alert.timestamp)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="danger">CRITICAL</Badge>
                        <p className="text-xs text-danger-700 mt-2 font-semibold">
                          {alert.slsRemaining}h remaining
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-text-secondary">
                ✓ No critical alerts
              </div>
            )}
          </Card>

          {/* Top Alerts Table */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h5 className="heading-5 text-primary m-0">
                All Alerts (Last 10)
              </h5>
              <Badge variant="primary">{topAlerts.data?.alerts.length || 0}</Badge>
            </div>
            {topAlerts.loading ? (
              <p className="text-text-secondary">Loading alerts...</p>
            ) : topAlerts.error ? (
              <AlertBanner type="danger" message={topAlerts.error} />
            ) : topAlerts.data?.alerts ? (
              <Table
                columns={[
                  {
                    key: "title",
                    header: "Alert",
                    width: "35%",
                    render: (value) => <span className="font-semibold">{value}</span>,
                  },
                  {
                    key: "institution",
                    header: "Institution",
                    width: "25%",
                  },
                  {
                    key: "severity",
                    header: "Risk Level",
                    width: "15%",
                    render: (value) => {
                      const risk = getRiskMetrics(value as string);
                      return (
                        <Badge variant={risk.level as any}>
                          {risk.label}
                        </Badge>
                      );
                    },
                  },
                  {
                    key: "slsRemaining",
                    header: "SLA",
                    width: "10%",
                    render: (value) => (
                      <span className="font-semibold">
                        {value}h
                      </span>
                    ),
                  },
                  {
                    key: "id",
                    header: "Action",
                    width: "15%",
                    render: () => (
                      <Button size="sm" variant="primary">
                        Review
                      </Button>
                    ),
                  },
                ]}
                data={topAlerts.data.alerts}
                rowKey="id"
                onRowClick={(row) => setSelectedAlert(row)}
              />
            ) : null}
          </Card>
        </div>

        {/* Right Sidebar: Analytics & Indicators */}
        <div className="space-y-6">
          {/* Real-time Indicators */}
          <Card>
            <h6 className="heading-6 text-primary m-0 mb-4">Live Indicators</h6>
            {realtime.loading ? (
              <p className="text-text-secondary">Loading...</p>
            ) : realtime.data ? (
              <div className="space-y-3">
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <p className="text-xs text-text-secondary">Notifications</p>
                  <p className="heading-4 text-primary mt-1">
                    {realtime.data.liveNotifications}
                  </p>
                </div>
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <p className="text-xs text-text-secondary">Edge Detections</p>
                  <p className="heading-4 text-primary mt-1">
                    {realtime.data.edgeDetectionCount}
                  </p>
                </div>
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <p className="text-xs text-text-secondary">Core Detections</p>
                  <p className="heading-4 text-primary mt-1">
                    {realtime.data.coreDetectionCount}
                  </p>
                </div>
              </div>
            ) : null}
          </Card>

          {/* Alert Lifecycle */}
          <Card>
            <h6 className="heading-6 text-primary m-0 mb-4">Lifecycle Status</h6>
            {lifecycle.loading ? (
              <p className="text-text-secondary">Loading...</p>
            ) : lifecycle.data ? (
              <div className="space-y-2">
                {Object.entries(lifecycle.data as AlertLifecycleResponse).map(
                  ([stage, count]: [string, number]) => (
                    <div key={stage} className="flex items-center justify-between p-2">
                      <span className="text-sm text-text-secondary capitalize">
                        {stage.replace(/_/g, " ")}
                      </span>
                      <Badge variant="primary">{count}</Badge>
                    </div>
                  )
                )}
              </div>
            ) : null}
          </Card>

          {/* Institution Risk (Regulator) */}
          {role === "regulator" && (
            <Card>
              <h6 className="heading-6 text-primary m-0 mb-4">
                Institution Risk Ranking
              </h6>
              {institutionRisk.loading ? (
                <p className="text-text-secondary">Loading...</p>
              ) : institutionRisk.data ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {institutionRisk.data.data
                    .slice(0, 5)
                    .map((institution, idx) => (
                      <div
                        key={institution.institution}
                        className={`p-3 rounded-lg flex items-center justify-between ${
                          idx < 3
                            ? "bg-warning-100"
                            : "bg-bg-tertiary"
                        }`}
                      >
                        <span className="text-sm font-semibold">
                          {idx + 1}. {institution.institution}
                        </span>
                        <Badge
                          variant={
                            institution.riskScore > 75
                              ? "danger"
                              : institution.riskScore > 50
                                ? "warning"
                                : "success"
                          }
                        >
                          {institution.riskScore}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : null}
            </Card>
          )}
        </div>
      </div>

      {/* Analytics Section */}
      {expandedView && (
        <Card>
          <h5 className="heading-5 text-primary m-0 mb-6">Analytics Heatmap</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Placeholder for Heatmap */}
            <div className="p-8 bg-bg-tertiary rounded-lg text-center">
              <p className="text-text-secondary">National Risk Heatmap</p>
              <div className="mt-4 h-32 bg-bg-secondary rounded-lg flex items-center justify-center">
                <span className="text-text-tertiary">Heatmap visualization here</span>
              </div>
            </div>

            {/* Placeholder for Trend */}
            <div className="p-8 bg-bg-tertiary rounded-lg text-center">
              <p className="text-text-secondary">24-Hour Trend</p>
              <div className="mt-4 h-32 bg-bg-secondary rounded-lg flex items-center justify-center">
                <span className="text-text-tertiary">Trend chart here</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-text-tertiary text-xs">
        <p>Dashboard updated at {new Date().toLocaleTimeString("en-NG")}</p>
        <p>
          🇳🇬 Central Bank of Nigeria Compliant • All activities logged and audited
        </p>
      </div>
    </div>
  );
}
