import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { reportExportSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = reportExportSchema.parse(body);

    const user = await getSessionUser();
    const userId = user?.id;

    // Generate a simple CSV/text export based on alerts data
    const alerts = await prisma.alert.findMany({
      include: { institution: { select: { name: true } } },
      orderBy: { timestamp: "desc" },
      take: 1000,
    });

    let content: string;
    let contentType: string;
    let fileName: string;

    if (data.format === "csv") {
      const header = "ID,Title,Severity,Institution,Detection,Stage,Risk Score,Amount,Customer,Timestamp";
      const rows = alerts.map(
        (a) =>
          `${a.id},"${a.title}",${a.severity},"${a.institution?.name ?? ""}",${a.detectionType},${a.lifecycleStage},${a.riskScore},${a.amount},"${a.customerName}",${a.timestamp.toISOString()}`
      );
      content = [header, ...rows].join("\n");
      contentType = "text/csv";
      fileName = `aml-report-${Date.now()}.csv`;
    } else {
      // For PDF/XLSX we return a simple text representation
      content = JSON.stringify(
        alerts.map((a) => ({
          id: a.id,
          title: a.title,
          severity: a.severity,
          institution: a.institution?.name,
          riskScore: a.riskScore,
          amount: a.amount,
          timestamp: a.timestamp.toISOString(),
        })),
        null,
        2
      );
      contentType = "application/json";
      fileName = `aml-report-${Date.now()}.${data.format}`;
    }

    // Log the export
    if (userId) {
      await prisma.reportExport.create({
        data: {
          userId,
          format: data.format.toUpperCase() as "PDF" | "CSV" | "XLSX",
          filters: (data.filters as Record<string, string>) ?? undefined,
          fileName,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
