import {
  AlertSeverity,
  LifecycleStage,
  TransactionStatus,
  TransactionType,
  UserRole,
  STRStatus,
  RuleType,
  ExportFormat,
} from "@prisma/client";

// ─── Severity mapping ────────────────────────────────────────────────────────

const severityMap: Record<string, AlertSeverity> = {
  critical: AlertSeverity.CRITICAL,
  high: AlertSeverity.HIGH,
  medium: AlertSeverity.MEDIUM,
  low: AlertSeverity.LOW,
};

const severityReverseMap: Record<AlertSeverity, string> = {
  [AlertSeverity.CRITICAL]: "critical",
  [AlertSeverity.HIGH]: "high",
  [AlertSeverity.MEDIUM]: "medium",
  [AlertSeverity.LOW]: "low",
};

export function toSeverity(s: string): AlertSeverity {
  return severityMap[s.toLowerCase()] ?? AlertSeverity.MEDIUM;
}

export function fromSeverity(s: AlertSeverity): string {
  return severityReverseMap[s] ?? "medium";
}

// ─── Lifecycle mapping ───────────────────────────────────────────────────────

const lifecycleMap: Record<string, LifecycleStage> = {
  new: LifecycleStage.NEW,
  underReview: LifecycleStage.UNDER_REVIEW,
  under_review: LifecycleStage.UNDER_REVIEW,
  escalated: LifecycleStage.ESCALATED,
  strSubmitted: LifecycleStage.STR_SUBMITTED,
  str_submitted: LifecycleStage.STR_SUBMITTED,
  closed: LifecycleStage.CLOSED,
};

const lifecycleReverseMap: Record<LifecycleStage, string> = {
  [LifecycleStage.NEW]: "new",
  [LifecycleStage.UNDER_REVIEW]: "underReview",
  [LifecycleStage.ESCALATED]: "escalated",
  [LifecycleStage.STR_SUBMITTED]: "strSubmitted",
  [LifecycleStage.CLOSED]: "closed",
};

export function toLifecycle(s: string): LifecycleStage {
  return lifecycleMap[s] ?? LifecycleStage.NEW;
}

export function fromLifecycle(s: LifecycleStage): string {
  return lifecycleReverseMap[s] ?? "new";
}

// ─── Transaction status mapping ──────────────────────────────────────────────

const txStatusMap: Record<string, TransactionStatus> = {
  normal: TransactionStatus.NORMAL,
  flagged: TransactionStatus.FLAGGED,
  under_review: TransactionStatus.UNDER_REVIEW,
  cleared: TransactionStatus.CLEARED,
};

const txStatusReverseMap: Record<TransactionStatus, string> = {
  [TransactionStatus.NORMAL]: "normal",
  [TransactionStatus.FLAGGED]: "flagged",
  [TransactionStatus.UNDER_REVIEW]: "under_review",
  [TransactionStatus.CLEARED]: "cleared",
};

export function toTxStatus(s: string): TransactionStatus {
  return txStatusMap[s.toLowerCase()] ?? TransactionStatus.NORMAL;
}

export function fromTxStatus(s: TransactionStatus): string {
  return txStatusReverseMap[s] ?? "normal";
}

// ─── Transaction type mapping ────────────────────────────────────────────────

const txTypeMap: Record<string, TransactionType> = {
  deposit: TransactionType.DEPOSIT,
  withdrawal: TransactionType.WITHDRAWAL,
  transfer: TransactionType.TRANSFER,
  wire: TransactionType.WIRE,
  cash: TransactionType.CASH,
  check: TransactionType.CHECK,
};

export function toTxType(s: string): TransactionType {
  return txTypeMap[s.toLowerCase()] ?? TransactionType.TRANSFER;
}

// ─── User role mapping ───────────────────────────────────────────────────────

const roleMap: Record<string, UserRole> = {
  admin: UserRole.ADMIN,
  regulator: UserRole.REGULATOR,
};

const roleReverseMap: Record<UserRole, string> = {
  [UserRole.ADMIN]: "admin",
  [UserRole.REGULATOR]: "regulator",
};

export function toUserRole(s: string): UserRole {
  return roleMap[s.toLowerCase()] ?? UserRole.REGULATOR;
}

export function fromUserRole(s: UserRole): string {
  return roleReverseMap[s] ?? "regulator";
}

// ─── STR status mapping ─────────────────────────────────────────────────────

const strStatusMap: Record<string, STRStatus> = {
  draft: STRStatus.DRAFT,
  submitted: STRStatus.SUBMITTED,
  under_review: STRStatus.UNDER_REVIEW,
  closed: STRStatus.CLOSED,
};

const strStatusReverseMap: Record<STRStatus, string> = {
  [STRStatus.DRAFT]: "draft",
  [STRStatus.SUBMITTED]: "submitted",
  [STRStatus.UNDER_REVIEW]: "under_review",
  [STRStatus.CLOSED]: "closed",
};

export function toSTRStatus(s: string): STRStatus {
  return strStatusMap[s.toLowerCase()] ?? STRStatus.DRAFT;
}

export function fromSTRStatus(s: STRStatus): string {
  return strStatusReverseMap[s] ?? "draft";
}

// ─── Rule type mapping ──────────────────────────────────────────────────────

const ruleTypeMap: Record<string, RuleType> = {
  threshold: RuleType.THRESHOLD,
  pattern: RuleType.PATTERN,
  velocity: RuleType.VELOCITY,
};

export function toRuleType(s: string): RuleType {
  return ruleTypeMap[s.toLowerCase()] ?? RuleType.THRESHOLD;
}

// ─── Export format mapping ───────────────────────────────────────────────────

const exportFormatMap: Record<string, ExportFormat> = {
  pdf: ExportFormat.PDF,
  csv: ExportFormat.CSV,
  xlsx: ExportFormat.XLSX,
};

export function toExportFormat(s: string): ExportFormat {
  return exportFormatMap[s.toLowerCase()] ?? ExportFormat.CSV;
}
