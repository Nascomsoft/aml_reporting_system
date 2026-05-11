import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/session";

export function isAdmin(user: SessionUser): boolean {
  return user.role.toLowerCase() === "admin";
}

export function scopedAlertWhere(user: SessionUser): Prisma.AlertWhereInput {
  if (isAdmin(user)) return {};
  if (!user.institutionId) {
    throw NextResponse.json({ error: "Forbidden: institution scope required" }, { status: 403 });
  }
  return { institutionId: user.institutionId };
}

export function scopedCaseWhere(user: SessionUser): Prisma.CaseWhereInput {
  if (isAdmin(user)) return {};
  if (!user.institutionId) {
    throw NextResponse.json({ error: "Forbidden: institution scope required" }, { status: 403 });
  }
  return {
    OR: [
      { investigatorId: user.id },
      { linkedAlerts: { some: { institutionId: user.institutionId } } },
    ],
  };
}

export function scopedSTRWhere(user: SessionUser): Prisma.STRSubmissionWhereInput {
  if (isAdmin(user)) return {};
  if (!user.institutionId) {
    throw NextResponse.json({ error: "Forbidden: institution scope required" }, { status: 403 });
  }
  return {
    OR: [
      { submittedBy: { institutionId: user.institutionId } },
      { case: { linkedAlerts: { some: { institutionId: user.institutionId } } } },
    ],
  };
}

export function assertAlertAccess(
  user: SessionUser,
  alert: { institutionId: string }
): void {
  if (isAdmin(user)) return;
  if (!user.institutionId || alert.institutionId !== user.institutionId) {
    throw NextResponse.json({ error: "Forbidden: alert is outside your institution" }, { status: 403 });
  }
}

export function assertCaseAccess(
  user: SessionUser,
  caseRecord: {
    investigatorId?: string | null;
    linkedAlerts?: Array<{ institutionId: string }>;
  }
): void {
  if (isAdmin(user)) return;

  const ownsInvestigation = caseRecord.investigatorId === user.id;
  const hasInstitutionAlert = Boolean(
    user.institutionId &&
      caseRecord.linkedAlerts?.some((alert) => alert.institutionId === user.institutionId)
  );

  if (!ownsInvestigation && !hasInstitutionAlert) {
    throw NextResponse.json({ error: "Forbidden: case is outside your scope" }, { status: 403 });
  }
}

export function assertSTRAccess(
  user: SessionUser,
  submission: {
    submittedById?: string | null;
    submittedBy?: { institutionId: string | null } | null;
    case?: { linkedAlerts?: Array<{ institutionId: string }> } | null;
  }
): void {
  if (isAdmin(user)) return;

  const submittedByInstitution =
    Boolean(user.institutionId) && submission.submittedBy?.institutionId === user.institutionId;
  const submittedBySelf = submission.submittedById === user.id;
  const linkedToInstitutionCase = Boolean(
    user.institutionId &&
      submission.case?.linkedAlerts?.some((alert) => alert.institutionId === user.institutionId)
  );

  if (!submittedByInstitution && !submittedBySelf && !linkedToInstitutionCase) {
    throw NextResponse.json({ error: "Forbidden: STR is outside your scope" }, { status: 403 });
  }
}
