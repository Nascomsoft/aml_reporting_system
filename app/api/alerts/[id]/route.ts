import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { alertUpdateSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { fromLifecycle, toLifecycle } from "@/lib/enumMaps";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = alertUpdateSchema.parse(body);

    const alert = await prisma.alert.update({
      where: { id },
      data: { lifecycleStage: toLifecycle(data.lifecycleStage) },
    });

    return NextResponse.json({
      success: true,
      alert: { id: alert.id, lifecycleStage: fromLifecycle(alert.lifecycleStage) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}