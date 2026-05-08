"use client";

import React, { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertResponse,
  amlAPI,
} from "../../AML_frontend/services/api";
import {
  AlertBanner,
  Card,
  Badge,
  Button,
  FormInput,
  Select,
  Table,
  Modal,
} from "@/components";
import { NIGERIAN_INSTITUTIONS, formatNGN } from "@/lib/localization";

// augmentation of alert type for management UI
interface ManagedAlert extends AlertResponse {
  customerName: string;
  riskScore: number; // 0-100
  amount: number;
  ruleTriggered: string;
  lifecycleStage: "new" | "underReview" | "escalated" | "strSubmitted" | "closed";
  slaRemainingHours: number;
  institution?: string;
  caseId?: string | null;
}

interface AlertApiRecord extends AlertResponse {
  customerName?: string;
  riskScore?: number;
  amount?: number;
  ruleTriggered?: string;
  lifecycleStage?: "new" | "underReview" | "escalated" | "strSubmitted" | "closed";
  caseId?: string | null;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  riskLevel: string;
  lifecycleStage: string;
  institution: string;
  amountMin: string;
  amountMax: string;
}

const EMPTY_FILTERS: FilterState = {
  dateFrom: "",
  dateTo: "",
  riskLevel: "",
  lifecycleStage: "",
  institution: "",
  amountMin: "",
  amountMax: "",
};

type SearchParamsLike = Pick<URLSearchParams, "get" | "toString">;

function getFiltersFromSearchParams(searchParams: SearchParamsLike): FilterState {
  return {
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    riskLevel: searchParams.get("riskLevel") ?? "",
    lifecycleStage: searchParams.get("lifecycleStage") ?? "",
    institution: searchParams.get("institution") ?? "",
    amountMin: searchParams.get("amountMin") ?? "",
    amountMax: searchParams.get("amountMax") ?? "",
  };
}

function filtersAreEqual(left: FilterState, right: FilterState): boolean {
  return (
    left.dateFrom === right.dateFrom &&
    left.dateTo === right.dateTo &&
    left.riskLevel === right.riskLevel &&
    left.lifecycleStage === right.lifecycleStage &&
    left.institution === right.institution &&
    left.amountMin === right.amountMin &&
    left.amountMax === right.amountMax
  );
}

export default function AlertManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [alerts, setAlerts] = useState<ManagedAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<ManagedAlert | null>(null);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<string>("");
  const [transitionNotes, setTransitionNotes] = useState("");
  const [transitioningAlertId, setTransitioningAlertId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "warning" | "danger" | "info";
    title: string;
    message: string;
  } | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const feedbackTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filters, setFilters] = useState<FilterState>(() =>
    getFiltersFromSearchParams(searchParams)
  );

  // Handle responsive screen size
  React.useEffect(() => {
    setIsLargeScreen(typeof window !== "undefined" && window.innerWidth >= 1024);
    
    const handleResize = () => {
      setIsLargeScreen(typeof window !== "undefined" && window.innerWidth >= 1024);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    const nextFilters = getFiltersFromSearchParams(searchParams);
    setFilters((currentFilters) =>
      filtersAreEqual(currentFilters, nextFilters) ? currentFilters : nextFilters
    );
  }, [searchParams]);

  React.useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams();

    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.riskLevel) params.set("riskLevel", filters.riskLevel);
    if (filters.lifecycleStage) params.set("lifecycleStage", filters.lifecycleStage);
    if (filters.institution) params.set("institution", filters.institution);
    if (filters.amountMin) params.set("amountMin", filters.amountMin);
    if (filters.amountMax) params.set("amountMax", filters.amountMax);

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery === currentQuery) {
      return;
    }

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [filters, pathname, router, searchParams]);

  // Fetch alerts whenever filters change
  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const resp = await amlAPI.getAlerts(1, 50, {
          severity: filters.riskLevel,
          lifecycleStage: filters.lifecycleStage,
          institution: filters.institution,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          amountMin: filters.amountMin,
          amountMax: filters.amountMax,
        });
        const mapped: ManagedAlert[] = resp.alerts.map((alert): ManagedAlert => {
          const a = alert as AlertApiRecord;
          return ({
          ...a,
          customerName: a.customerName || a.institution || "--",
          riskScore: a.riskScore ?? (a.severity === 'critical' ? 90 : a.severity === 'high' ? 70 : a.severity === 'medium' ? 50 : 20),
          amount: a.amount ?? 0,
          ruleTriggered: a.ruleTriggered || "N/A",
          lifecycleStage: a.lifecycleStage || 'new',
          slaRemainingHours: a.slsRemaining,
          });
        });
        setAlerts(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const showFeedback = (
    type: "success" | "warning" | "danger" | "info",
    title: string,
    message: string
  ) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    setFeedback({ type, title, message });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 4000);
  };

  const getTransitionLabel = (stage: string) => {
    switch (stage) {
      case "underReview":
        return "under review";
      case "escalated":
        return "escalated";
      case "strSubmitted":
        return "STR submitted";
      default:
        return stage;
    }
  };

  const performTransition = async (alert: ManagedAlert, targetStage: string) => {
    setTransitioningAlertId(alert.id);

    try {
      let caseId = alert.caseId ?? null;

      if (targetStage === "underReview" && !caseId) {
        const result = await amlAPI.createOrLinkCaseFromAlert(alert.id, {
          note: transitionNotes || "Alert moved to investigation from triage.",
        });
        caseId = result.case.id;
      } else if (targetStage === "escalated") {
        if (!caseId) {
          const result = await amlAPI.createOrLinkCaseFromAlert(alert.id, {
            note: transitionNotes || "Case opened before escalation from alert triage.",
          });
          caseId = result.case.id;
        }
        await amlAPI.escalateCaseToRegulator(
          caseId,
          transitionNotes || "Escalated from alert triage."
        );
      } else {
        await amlAPI.updateAlertLifecycle(alert.id, targetStage);
      }

      setAlerts((currentAlerts) =>
        currentAlerts.map((currentAlert) =>
          currentAlert.id === alert.id
            ? {
                ...currentAlert,
                lifecycleStage: targetStage as ManagedAlert["lifecycleStage"],
                caseId,
              }
            : currentAlert
        )
      );

      setSelectedAlert((currentAlert) =>
        currentAlert?.id === alert.id
          ? {
              ...currentAlert,
              lifecycleStage: targetStage as ManagedAlert["lifecycleStage"],
              caseId,
            }
          : currentAlert
      );
      showFeedback(
        "success",
        "Alert updated",
        `Alert ${alert.id} moved to ${getTransitionLabel(targetStage)}.`
      );
      return true;
    } catch {
      showFeedback(
        "danger",
        "Update failed",
        `Could not move alert ${alert.id} to ${getTransitionLabel(targetStage)}.`
      );
      return false;
    } finally {
      setTransitioningAlertId(null);
    }
  };

  const openLinkedCase = (caseId?: string | null) => {
    if (caseId) {
      router.push(`/case_management/${caseId}`);
    }
  };

  const confirmTransition = async () => {
    if (selectedAlert) {
      const succeeded = await performTransition(selectedAlert, pendingTransition);
      if (!succeeded) {
        return;
      }
    }
    setShowTransitionModal(false);
    setPendingTransition("");
  };

  // Count critical & overdue alerts
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const overdueCount = alerts.filter((a) => a.slaRemainingHours < 4).length;

  // Risk color mapping
  const getRiskColor = (severity: string) => {
    switch (severity) {
      case "critical": return "danger";
      case "high": return "warning";
      case "medium": return "warning";
      default: return "primary";
    }
  };

  // Lifecycle color mapping
  const getLifecycleColor = (stage: string) => {
    switch (stage) {
      case "new": return "primary";
      case "underReview": return "warning";
      case "escalated": return "danger";
      case "strSubmitted": return "success";
      case "closed": return "success";
      default: return "primary";
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2 text-primary m-0">Alert Management</h1>
          <p className="text-text-secondary text-base mt-2">
            Triage, review, and manage suspicious activity alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="danger">
              ⚠️ {criticalCount} Critical
            </Badge>
          )}
          {overdueCount > 0 && (
            <Badge variant="warning">
              ⏰ {overdueCount} Overdue SLA
            </Badge>
          )}
        </div>
      </div>

      {feedback && (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Grid: Filters + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Filters Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h6 className="heading-6 text-primary m-0">Filters</h6>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFilterOpen(!filterOpen)}
                className="lg:hidden"
                aria-label={filterOpen ? "Hide filters" : "Show filters"}
              >
                ☰
              </Button>
            </div>

            {(filterOpen || isLargeScreen) && (
              <div className="space-y-4">
                {/* Filter by Date Range */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-2">
                    Date Range
                  </label>
                  <FormInput
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter("dateFrom", e.target.value)}
                    placeholder="From"
                    fullWidth
                  />
                  <FormInput
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                    placeholder="To"
                    fullWidth
                    className="mt-2"
                  />
                </div>

                {/* Filter by Risk Level */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-2">
                    Risk Level
                  </label>
                  <Select
                    value={filters.riskLevel}
                    onChange={(e) => updateFilter("riskLevel", e.target.value)}
                    placeholder="All Risk Levels"
                    placeholderDisabled
                    options={[
                      { value: "low", label: "Low Risk" },
                      { value: "medium", label: "Medium Risk" },
                      { value: "high", label: "High Risk" },
                      { value: "critical", label: "Critical Risk" },
                    ]}
                    fullWidth
                  />
                </div>

                {/* Filter by Lifecycle */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-2">
                    Lifecycle Stage
                  </label>
                  <Select
                    value={filters.lifecycleStage}
                    onChange={(e) => updateFilter("lifecycleStage", e.target.value)}
                    placeholder="All Stages"
                    options={[
                      { value: "new", label: "New" },
                      { value: "underReview", label: "Under Review" },
                      { value: "escalated", label: "Escalated" },
                      { value: "strSubmitted", label: "STR Submitted" },
                      { value: "closed", label: "Closed" },
                    ]}
                    fullWidth
                  />
                </div>

                {/* Filter by Institution */}
                  <Select
                    label="Financial Institution"
                    value={filters.institution}
                    onChange={(e) => updateFilter("institution", e.target.value)}
                    placeholder="Select an institution"
                    placeholderDisabled
                    options={NIGERIAN_INSTITUTIONS.map((institution) => ({
                      value: institution.name,
                      label: institution.name,
                    }))}
                    fullWidth
                  />

                {/* Filter by Amount Range */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-2">
                    Amount Range (NGN)
                  </label>
                  <FormInput
                    type="number"
                    value={filters.amountMin}
                    onChange={(e) => updateFilter("amountMin", e.target.value)}
                    placeholder="Min"
                    fullWidth
                  />
                  <FormInput
                    type="number"
                    value={filters.amountMax}
                    onChange={(e) => updateFilter("amountMax", e.target.value)}
                    placeholder="Max"
                    fullWidth
                    className="mt-2"
                  />
                </div>

                {/* Clear Button */}
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={clearFilters}
                  size="sm"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Alerts Table */}
        <div className="lg:col-span-3 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <p className="text-xs text-text-secondary mb-1">Total Alerts</p>
              <p className="heading-4 text-primary">{alerts.length}</p>
            </Card>
            <Card>
              <p className="text-xs text-text-secondary mb-1">Critical</p>
              <p
                className="heading-4"
                style={{ color: criticalCount > 0 ? "#dc2626" : "#16a34a" }}
              >
                {criticalCount}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-secondary mb-1">SLA Overdue</p>
              <p
                className="heading-4"
                style={{ color: overdueCount > 0 ? "#ea580c" : "#16a34a" }}
              >
                {overdueCount}
              </p>
            </Card>
          </div>

          {/* Alerts Table */}
          <Card>
            {loading ? (
              <p className="text-text-secondary text-center py-8">
                Loading alerts...
              </p>
            ) : alerts.length === 0 ? (
              <p className="text-text-secondary text-center py-8">
                No alerts match the current filters
              </p>
            ) : (
              <Table
                columns={[
                  {
                    key: "title",
                    header: "Alert",
                    width: "25%",
                    render: (value, row) => (
                      <div
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setSelectedAlert(row as ManagedAlert)}
                      >
                        <p className="font-semibold">{value}</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          {row.customerName}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "severity",
                    header: "Risk",
                    width: "12%",
                    render: (value) => (
                      <Badge variant={getRiskColor(value as string)}>
                        {String(value).toUpperCase()}
                      </Badge>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    width: "14%",
                    render: (value) => (
                      <span className="font-semibold">
                        {formatNGN(Number(value))}
                      </span>
                    ),
                  },
                  {
                    key: "ruleTriggered",
                    header: "Rule",
                    width: "15%",
                  },
                  {
                    key: "lifecycleStage",
                    header: "Status",
                    width: "12%",
                    render: (value) => (
                      <Badge variant={getLifecycleColor(value as string)}>
                        {String(value).replace(/([A-Z])/g, " $1")}
                      </Badge>
                    ),
                  },
                  {
                    key: "slsRemaining",
                    header: "SLA",
                    width: "10%",
                    render: (value) => {
                      const hours = Number(value);
                      const isOverdue = hours < 4;
                      return (
                        <span
                          className={`font-semibold ${
                            isOverdue ? "text-danger-600" : "text-primary"
                          }`}
                        >
                          {hours}h
                        </span>
                      );
                    },
                  },
                  {
                    key: "id",
                    header: "Action",
                    width: "12%",
                    render: (value, row) => {
                      const alert = row as ManagedAlert;
                      return (
                        <div className="flex gap-1">
                          {alert.lifecycleStage === "new" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              isLoading={transitioningAlertId === alert.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void performTransition(alert, "underReview");
                              }}
                            >
                              Case
                            </Button>
                          )}
                          {alert.lifecycleStage === "underReview" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              isLoading={transitioningAlertId === alert.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void performTransition(alert, "escalated");
                              }}
                            >
                              Escalate
                            </Button>
                          )}
                          {alert.caseId && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                openLinkedCase(alert.caseId);
                              }}
                            >
                              Open
                            </Button>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
                data={alerts}
                rowKey="id"
                onRowClick={(row) => setSelectedAlert(row)}
              />
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedAlert) && !showTransitionModal}
        title={`Alert Details: ${selectedAlert?.id ?? ""}`}
        onClose={() => setSelectedAlert(null)}
        footer={
          selectedAlert ? (
            <>
              {selectedAlert.caseId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openLinkedCase(selectedAlert.caseId)}
                >
                  Open Case
                </Button>
              )}
              {selectedAlert.lifecycleStage === "new" && (
                <Button
                  type="button"
                  variant="primary"
                  isLoading={transitioningAlertId === selectedAlert.id}
                  onClick={() => void performTransition(selectedAlert, "underReview")}
                >
                  Create Case
                </Button>
              )}
              {selectedAlert.lifecycleStage === "underReview" && (
                <Button
                  type="button"
                  variant="danger"
                  isLoading={transitioningAlertId === selectedAlert.id}
                  onClick={() => void performTransition(selectedAlert, "escalated")}
                >
                  Escalate Case
                </Button>
              )}
            </>
          ) : null
        }
      >
        {selectedAlert && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-secondary">Customer</p>
                <p className="font-semibold text-text-primary">{selectedAlert.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Risk</p>
                <Badge variant={getRiskColor(selectedAlert.severity)}>
                  {selectedAlert.severity.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Amount</p>
                <p className="font-semibold text-text-primary">
                  {formatNGN(selectedAlert.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Status</p>
                <Badge variant={getLifecycleColor(selectedAlert.lifecycleStage)}>
                  {getTransitionLabel(selectedAlert.lifecycleStage)}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-text-secondary">Rule Triggered</p>
                <p className="font-semibold text-text-primary">{selectedAlert.ruleTriggered}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-text-secondary">Linked Case</p>
                <p className="font-mono text-text-primary">{selectedAlert.caseId ?? "None"}</p>
              </div>
            </div>
            <textarea
              value={transitionNotes}
              onChange={(e) => setTransitionNotes(e.target.value)}
              placeholder="Add workflow note..."
              className="input w-full"
              rows={3}
            />
          </div>
        )}
      </Modal>

      {/* Transition Modal */}
      <Modal
        isOpen={showTransitionModal}
        title={`Transition Alert: ${selectedAlert?.id}`}
        onClose={() => {
          setShowTransitionModal(false);
          setTransitionNotes("");
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowTransitionModal(false);
                setTransitionNotes("");
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={confirmTransition}>
              Confirm Transition
            </Button>
          </>
        }
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary mb-2">
                Alert ID: <span className="font-mono text-primary">{selectedAlert.id}</span>
              </p>
              <p className="text-sm text-text-secondary mb-2">
                Current Status: <Badge variant="primary">{selectedAlert.lifecycleStage}</Badge>
              </p>
              <p className="text-sm text-text-secondary mb-2">
                New Status:{" "}
                <Badge variant={getLifecycleColor(pendingTransition)}>
                  {pendingTransition}
                </Badge>
              </p>
            </div>

            <div className="bg-bg-secondary p-4 rounded-lg">
              <p className="text-sm font-semibold text-primary mb-3">
                Alert Details
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-text-secondary">Institution:</span>{" "}
                  <span className="font-semibold">{selectedAlert.institution}</span>
                </p>
                <p>
                  <span className="text-text-secondary">Amount:</span>{" "}
                  <span className="font-semibold">{formatNGN(selectedAlert.amount)}</span>
                </p>
                <p>
                  <span className="text-text-secondary">Rule Triggered:</span>{" "}
                  <span className="font-semibold">{selectedAlert.ruleTriggered}</span>
                </p>
                <p>
                  <span className="text-text-secondary">Detection Method:</span>{" "}
                  <Badge variant="primary">Rule-based</Badge>
                </p>
                <p>
                  <span className="text-text-secondary">SLA Remaining:</span>{" "}
                  <span className="font-semibold">{selectedAlert.slaRemainingHours}h</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Transition Notes (Optional)
              </label>
              <textarea
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder="Add notes about why you're making this transition..."
                className="input"
                rows={3}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
