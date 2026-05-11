import { z } from "zod/v4";

// ─── Alert Schemas ───────────────────────────────────────────────────────────

export const alertFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  lifecycleStage: z.enum(["new", "underReview", "escalated", "strSubmitted", "closed"]).optional(),
  institution: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  sortBy: z.string().default("slsRemaining"),
});

export const alertUpdateSchema = z.object({
  lifecycleStage: z.enum(["new", "underReview", "escalated", "strSubmitted", "closed"]),
});

export const alertCaseTransitionSchema = z.object({
  caseId: z.string().optional(),
  summary: z.string().optional(),
  note: z.string().optional(),
});

// ─── Case Schemas ────────────────────────────────────────────────────────────

export const caseUpdateSchema = z.object({
  status: z.enum(["new", "underReview", "escalated", "strSubmitted", "closed"]).optional(),
  investigatorId: z.string().optional(),
  escalationLevel: z.number().int().min(0).max(5).optional(),
  summary: z.string().optional(),
});

export const caseEscalateSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export const caseDiscussionSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

export const caseTagSchema = z.object({
  tag: z.string().trim().min(1, "Tag cannot be empty"),
});

// ─── STR Schemas ─────────────────────────────────────────────────────────────

export const strSubmissionSchema = z.object({
  transactionSummary: z.string().min(1),
  customerName: z.string().min(1),
  accountNumber: z.string().min(1),
  descriptionOfSuspicion: z.string().min(1),
  rulesTriggered: z.array(z.string()).min(1),
  transactionIds: z.array(z.string()).default([]),
  behavioralDeviations: z.array(z.string()).default([]),
  narrative: z.string().min(10),
  riskClassification: z.enum(["critical", "high", "medium", "low"]),
  supportingDocuments: z.array(z.string()).default([]),
  caseId: z.string().optional(),
});

export const strUpdateSchema = z.object({
  transactionSummary: z.string().optional(),
  narrative: z.string().optional(),
  status: z.enum(["draft", "submitted", "under_review", "closed"]).optional(),
  reviewNote: z.string().optional(),
});

// ─── Rule Schemas ────────────────────────────────────────────────────────────

export const ruleCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  ruleType: z.enum(["threshold", "pattern", "velocity"]),
  threshold: z.number().optional(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  riskWeight: z.number().min(0).max(10).default(1.0),
  condition: z.string().optional(),
});

export const ruleUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  ruleType: z.enum(["threshold", "pattern", "velocity"]).optional(),
  threshold: z.number().optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  riskWeight: z.number().min(0).max(10).optional(),
  condition: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ─── User Schemas ────────────────────────────────────────────────────────────

export const userSignupSchema = z.object({
  email: z.email(),
  name: z.string().min(2),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "regulator"]).default("regulator"),
  institutionId: z.string().optional(),
});

export const userLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// ─── Transaction Schemas ─────────────────────────────────────────────────────

export const transactionFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  riskLevel: z.enum(["high", "medium", "low"]).optional(),
  accountNumber: z.string().optional(),
  customerName: z.string().optional(),
  transactionType: z.enum(["deposit", "withdrawal", "transfer", "wire", "cash", "check"]).optional(),
  country: z.string().optional(),
  status: z.enum(["normal", "flagged", "under_review", "cleared"]).optional(),
});

// ─── Report Export Schema ────────────────────────────────────────────────────

export const reportExportSchema = z.object({
  format: z.enum(["pdf", "csv", "xlsx"]),
  filters: z.record(z.string(), z.unknown()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
