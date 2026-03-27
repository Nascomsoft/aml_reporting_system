"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  Badge,
  Button,
  FormInput,
  Select,
  Table,
  Modal,
  AlertBanner,
  KPICard,
} from "@/components";
import { formatDateTimeNG, formatNumberShort } from "@/lib/localization";
import { amlAPI, useAsync, AdminMetricsResponse } from "@/AML_frontend/services/api";

// Types
interface AMLRule {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "inactive" | "testing";
  createdDate: string;
  triggeredCount: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "bank_officer" | "admin" | "regulator";
  status: "active" | "inactive";
  createdDate: string;
  lastLogin: string;
}

interface Institution {
  id: string;
  name: string;
  code: string;
  cbncodes: string; // CBN institution code
  status: "verified" | "pending" | "suspended";
  alertsThisMonth: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  resource: string;
  timestamp: string;
  status: "success" | "failure";
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "overview" | "rules" | "users" | "institutions"
  >("dashboard");

  // Fetch admin metrics
  const adminMetrics = useAsync<AdminMetricsResponse>(() => amlAPI.getAdminMetrics());

  // Rules Management
  const [rules, setRules] = useState<AMLRule[]>([
    {
      id: "RULE-001",
      name: "High Value Transaction Threshold",
      description: "Transactions exceeding ₦10,000,000 daily limit",
      severity: "high",
      status: "active",
      createdDate: "2026-01-15",
      triggeredCount: 1247,
    },
    {
      id: "RULE-002",
      name: "Unusual Geographic Pattern",
      description: "Transactions to/from high-risk jurisdictions",
      severity: "critical",
      status: "active",
      createdDate: "2026-01-10",
      triggeredCount: 89,
    },
    {
      id: "RULE-003",
      name: "Rapid Account Depletion",
      description: "Account balance drops >80% in 24 hours",
      severity: "high",
      status: "testing",
      createdDate: "2026-02-01",
      triggeredCount: 12,
    },
  ]);

  const [users, setUsers] = useState<User[]>([
    {
      id: "USER-001",
      name: "Chioma Okonkwo",
      email: "chioma.okonkwo@bank.ng",
      role: "bank_officer",
      status: "active",
      createdDate: "2025-12-01",
      lastLogin: "2026-03-27",
    },
    {
      id: "USER-002",
      name: "Emeka Adeyemi",
      email: "emeka.adeyemi@bank.ng",
      role: "admin",
      status: "active",
      createdDate: "2025-11-15",
      lastLogin: "2026-03-27",
    },
    {
      id: "USER-003",
      name: "Zainab Hassan",
      email: "zainab.hassan@cbn.gov.ng",
      role: "regulator",
      status: "active",
      createdDate: "2026-01-01",
      lastLogin: "2026-03-26",
    },
  ]);

  const [institutions, setInstitutions] = useState<Institution[]>([
    {
      id: "INST-001",
      name: "Guaranty Trust Bank",
      code: "GTB",
      cbncodes: "058",
      status: "verified",
      alertsThisMonth: 45,
      riskLevel: "low",
    },
    {
      id: "INST-002",
      name: "Access Bank Nigeria",
      code: "ACCESS",
      cbncodes: "044",
      status: "verified",
      alertsThisMonth: 32,
      riskLevel: "low",
    },
    {
      id: "INST-003",
      name: "Zenith Bank",
      code: "ZENITH",
      cbncodes: "057",
      status: "verified",
      alertsThisMonth: 78,
      riskLevel: "medium",
    },
  ]);

  const [activityLog, setActivityLog] = useState<ActivityLog[]>([
    {
      id: "ACT-001",
      user: "Emeka Adeyemi",
      action: "Activated rule",
      resource: "RULE-002",
      timestamp: "2026-03-27 14:32",
      status: "success",
    },
    {
      id: "ACT-002",
      user: "Chioma Okonkwo",
      action: "Created case",
      resource: "CASE-12345",
      timestamp: "2026-03-27 13:15",
      status: "success",
    },
    {
      id: "ACT-003",
      user: "System",
      action: "Failed login attempt",
      resource: "USER-004",
      timestamp: "2026-03-27 12:45",
      status: "failure",
    },
  ]);

  // Modals
  const [showNewRule, setShowNewRule] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showNewInstitution, setShowNewInstitution] = useState(false);

  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    severity: "high",
  });

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "bank_officer",
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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
      case "active":
        return "success";
      case "inactive":
        return "warning";
      case "testing":
        return "primary";
      case "verified":
        return "success";
      case "pending":
        return "warning";
      case "suspended":
        return "danger";
      case "success":
        return "success";
      case "failure":
        return "danger";
      default:
        return "primary";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="heading-2 text-primary m-0">Admin Dashboard</h1>
        <p className="text-text-secondary text-base mt-2">
          System management, rules, users, and institution oversight
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-bg-secondary">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "dashboard"
              ? "border-b-2 border-accent-600 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "overview"
              ? "border-b-2 border-accent-600 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          📋 Overview
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "rules"
              ? "border-b-2 border-accent-600 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          🔧 Rules
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "users"
              ? "border-b-2 border-accent-600 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          👥 Users
        </button>
        <button
          onClick={() => setActiveTab("institutions")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "institutions"
              ? "border-b-2 border-accent-600 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          🏦 Institutions
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* System Metrics */}
          <div className="space-y-4">
            <h2 className="heading-3 text-primary m-0">System Analytics</h2>
            {adminMetrics.loading && <div className="text-text-secondary">Loading metrics...</div>}
            {adminMetrics.error && <AlertBanner variant="danger" title="Error" message={adminMetrics.error} />}
            {adminMetrics.data && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Active Users"
                  value={adminMetrics.data.activeUsers}
                  icon="👥"
                  subtext="System-wide"
                />
                <KPICard
                  title="Processing Rate"
                  value={adminMetrics.data.dataProcessingRate}
                  icon="⚡"
                  subtext="Alerts per hour"
                />
                <KPICard
                  title="Rule Effectiveness"
                  value={adminMetrics.data.ruleEffectiveness}
                  icon="🎯"
                  subtext="Detection rate"
                />
                <KPICard
                  title="System Uptime"
                  value={adminMetrics.data.systemUptime}
                  icon="✅"
                  subtext="Last 30 days"
                />
              </div>
            )}
          </div>

          {/* Detailed Metrics */}
          {adminMetrics.data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <h3 className="heading-4 text-primary m-0 mb-4">Monitored Institutions</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Total</span>
                    <span className="heading-3 text-primary m-0">{adminMetrics.data.monitoredInstitutions}</span>
                  </div>
                  <div className="text-sm text-text-secondary">Banks and financial institutions under monitoring</div>
                </div>
              </Card>

              <Card>
                <h3 className="heading-4 text-primary m-0 mb-4">Active Rules</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Total</span>
                    <span className="heading-3 text-primary m-0">{adminMetrics.data.totalRules}</span>
                  </div>
                  <div className="text-sm text-text-secondary">AML detection rules in production</div>
                </div>
              </Card>

              <Card>
                <h3 className="heading-4 text-primary m-0 mb-4">Total Alerts</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Generated</span>
                    <span className="heading-3 text-primary m-0">{adminMetrics.data.totalAlerts.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-text-secondary">Lifetime system-wide detections</div>
                </div>
              </Card>
            </div>
          )}

          {/* System Status */}
          {adminMetrics.data && (
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-text-secondary">System Uptime</span>
                    <span className="text-sm font-semibold text-accent-600">{adminMetrics.data.systemUptime}</span>
                  </div>
                  <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div className="w-full h-2 bg-accent-600 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-text-secondary">Rule Effectiveness</span>
                    <span className="text-sm font-semibold text-accent-600">{adminMetrics.data.ruleEffectiveness}</span>
                  </div>
                  <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div className="w-11/12 h-2 bg-accent-600 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-text-secondary">
                Last backup: {new Date(adminMetrics.data.lastBackupTime).toLocaleString()}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Active Rules"
              value={rules.filter((r) => r.status === "active").length}
              icon="📋"
              subtext="Production"
              onClick={() => setActiveTab("rules")}
            />
            <KPICard
              title="System Users"
              value={users.length}
              icon="👥"
              subtext="All roles"
              onClick={() => setActiveTab("users")}
            />
            <KPICard
              title="Institutions"
              value={institutions.length}
              icon="🏦"
              subtext="Verified: 3"
              onClick={() => setActiveTab("institutions")}
            />
            <KPICard
              title="Today's Actions"
              value={activityLog.length}
              icon="📊"
              subtext={activityLog.filter((a) => a.status === "success").length +
                " successful"}
              trend={{
                direction: "up",
                value: "12%",
                label: "vs yesterday",
              }}
            />
          </div>

          {/* System Health & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Health */}
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">System Health</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-text-secondary">
                      API Response Time
                    </span>
                    <span className="text-xs font-semibold text-accent-600">
                      145ms
                    </span>
                  </div>
                  <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div className="w-2/3 h-2 bg-accent-600 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-text-secondary">
                      Database Load
                    </span>
                    <span className="text-xs font-semibold text-warning-600">
                      62%
                    </span>
                  </div>
                  <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div className="w-3/5 h-2 bg-warning-600 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-text-secondary">
                      Cache Hit Rate
                    </span>
                    <span className="text-xs font-semibold text-accent-600">
                      94%
                    </span>
                  </div>
                  <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div className="w-11/12 h-2 bg-accent-600 rounded-full" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setActiveTab("rules")}
                >
                  ➕ New Rule
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setActiveTab("users")}
                >
                  👤 New User
                </Button>
                <Button variant="secondary" fullWidth>
                  📋 Export Report
                </Button>
                <Button variant="secondary" fullWidth>
                  🔧 System Settings
                </Button>
              </div>
            </Card>

            {/* Alerts */}
            <Card>
              <h3 className="heading-4 text-primary m-0 mb-4">
                System Alerts
              </h3>
              <div className="space-y-2">
                <Badge variant="warning">
                  ⚠️ High DB load detected
                </Badge>
                <Badge variant="primary">
                  ℹ️ Rule RULE-003 in testing
                </Badge>
                <Badge variant="success">
                  ✓ All backups completed
                </Badge>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <h3 className="heading-4 text-primary m-0 mb-4">
              Recent Activity
            </h3>
            <Table
              columns={[
                {
                  key: "user",
                  header: "User",
                  width: "20%",
                },
                {
                  key: "action",
                  header: "Action",
                  width: "25%",
                },
                {
                  key: "resource",
                  header: "Resource",
                  width: "20%",
                  render: (value) => (
                    <code className="text-xs bg-bg-secondary px-2 py-1 rounded">
                      {value}
                    </code>
                  ),
                },
                {
                  key: "timestamp",
                  header: "Time",
                  width: "18%",
                  render: (value) => (
                    <span className="text-sm text-text-secondary">{value}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  width: "17%",
                  render: (value) => (
                    <Badge variant={getStatusColor(value as string)}>
                      {(value as string).toUpperCase()}
                    </Badge>
                  ),
                },
              ]}
              data={activityLog}
              rowKey="id"
            />
          </Card>
        </div>
      )}

      {/* Rules Management Tab */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-3 text-primary m-0">Rule Management</h2>
            <Button variant="success" onClick={() => setShowNewRule(true)}>
              ➕ Create Rule
            </Button>
          </div>

          <Card>
            <Table
              columns={[
                {
                  key: "id",
                  header: "Rule ID",
                  width: "15%",
                  render: (value) => <code className="text-xs">{value}</code>,
                },
                {
                  key: "name",
                  header: "Rule Name",
                  width: "25%",
                },
                {
                  key: "description",
                  header: "Description",
                  width: "25%",
                  render: (value) => (
                    <span className="text-sm text-text-secondary">{value}</span>
                  ),
                },
                {
                  key: "severity",
                  header: "Severity",
                  width: "12%",
                  render: (value) => (
                    <Badge variant={getSeverityColor(value as string)}>
                      {(value as string).toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  width: "12%",
                  render: (value) => (
                    <Badge variant={getStatusColor(value as string)}>
                      {(value as string).toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "triggeredCount",
                  header: "Triggered",
                  width: "11%",
                  render: (value) => (
                    <span className="font-semibold">
                      {formatNumberShort(Number(value))}
                    </span>
                  ),
                },
              ]}
              data={rules}
              rowKey="id"
            />
          </Card>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-3 text-primary m-0">User Management</h2>
            <Button variant="success" onClick={() => setShowNewUser(true)}>
              👤 Add User
            </Button>
          </div>

          <Card>
            <Table
              columns={[
                {
                  key: "name",
                  header: "Name",
                  width: "25%",
                },
                {
                  key: "email",
                  header: "Email",
                  width: "28%",
                  render: (value) => (
                    <code className="text-xs bg-bg-secondary px-2 py-1 rounded">
                      {value}
                    </code>
                  ),
                },
                {
                  key: "role",
                  header: "Role",
                  width: "15%",
                  render: (value) => (
                    <Badge variant="primary">
                      {(value as string)
                        .replace(/_/g, " ")
                        .toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  width: "12%",
                  render: (value) => (
                    <Badge variant={getStatusColor(value as string)}>
                      {(value as string).toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "lastLogin",
                  header: "Last Login",
                  width: "20%",
                  render: (value) => (
                    <span className="text-sm text-text-secondary">{value}</span>
                  ),
                },
              ]}
              data={users}
              rowKey="id"
            />
          </Card>
        </div>
      )}

      {/* Institution Management Tab */}
      {activeTab === "institutions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-3 text-primary m-0">
              Institution Management
            </h2>
            <Button
              variant="success"
              onClick={() => setShowNewInstitution(true)}
            >
              🏦 Add Institution
            </Button>
          </div>

          <Card>
            <Table
              columns={[
                {
                  key: "name",
                  header: "Institution",
                  width: "25%",
                },
                {
                  key: "code",
                  header: "Code",
                  width: "12%",
                  render: (value) => <code className="text-xs">{value}</code>,
                },
                {
                  key: "cbncodes",
                  header: "CBN Code",
                  width: "12%",
                  render: (value) => <code className="text-xs">{value}</code>,
                },
                {
                  key: "status",
                  header: "Status",
                  width: "15%",
                  render: (value) => (
                    <Badge variant={getStatusColor(value as string)}>
                      {(value as string).toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "riskLevel",
                  header: "Risk",
                  width: "12%",
                  render: (value) => (
                    <Badge variant={getRiskColor(value as string)}>
                      {(value as string).toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "alertsThisMonth",
                  header: "Alerts (This Month)",
                  width: "14%",
                  render: (value) => (
                    <span className="font-semibold">{value}</span>
                  ),
                },
              ]}
              data={institutions}
              rowKey="id"
            />
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <Card className="fixed bottom-8 left-8 right-8 lg:left-auto lg:right-8 lg:w-96">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={activeTab === "overview" ? "primary" : "secondary"}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </Button>
          <Button
            size="sm"
            variant={activeTab === "rules" ? "primary" : "secondary"}
            onClick={() => setActiveTab("rules")}
          >
            📋 Rules
          </Button>
          <Button
            size="sm"
            variant={activeTab === "users" ? "primary" : "secondary"}
            onClick={() => setActiveTab("users")}
          >
            👥 Users
          </Button>
          <Button
            size="sm"
            variant={activeTab === "institutions" ? "primary" : "secondary"}
            onClick={() => setActiveTab("institutions")}
          >
            🏦 Institutions
          </Button>
        </div>
      </Card>
    </div>
  );
}

