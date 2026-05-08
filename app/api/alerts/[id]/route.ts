import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { alertUpdateSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { fromLifecycle, toLifecycle } from "@/lib/enumMaps";
import { requireAuth } from "@/lib/session";
import { assertAlertAccess } from "@/lib/workflowAuth";
import { createAuditLog } from "@/lib/auditLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = alertUpdateSchema.parse(body);

    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    assertAlertAccess(user, existing);

    const alert = await prisma.alert.update({
      where: { id },
      data: { lifecycleStage: toLifecycle(data.lifecycleStage) },
    });

    await createAuditLog({
      userId: user.id,
      action: "ALERT_UPDATE",
      resource: "alert",
      resourceId: alert.id,
      changes: { lifecycleStage: data.lifecycleStage },
    });

    return NextResponse.json({
      success: true,
      alert: { id: alert.id, lifecycleStage: fromLifecycle(alert.lifecycleStage) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
