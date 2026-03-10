import prisma from "@/lib/prisma";

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "ALERT_UPDATE"
  | "CASE_CREATE"
  | "CASE_UPDATE"
  | "CASE_ESCALATE"
  | "STR_SUBMIT"
  | "STR_UPDATE"
  | "RULE_CREATE"
  | "RULE_UPDATE"
  | "RULE_DELETE"
  | "EXPORT"
  | "USER_CREATE"
  | "USER_UPDATE";

interface AuditLogParams {
  userId: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ip?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        changes: params.changes ? JSON.parse(JSON.stringify(params.changes)) : undefined,
        ip: params.ip,
      },
    });
  } catch (error) {
    // Don't let audit logging failure break the main flow
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}

export async function createCaseAudit(params: {
  caseId: string;
  event: string;
  user: string;
  details?: string;
  ip?: string;
}) {
  try {
    await prisma.caseAuditEntry.create({
      data: {
        caseId: params.caseId,
        event: params.event,
        user: params.user,
        details: params.details,
        ip: params.ip,
      },
    });
  } catch (error) {
    console.error("[CaseAudit] Failed to create case audit:", error);
  }
}
