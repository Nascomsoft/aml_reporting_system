import { NextResponse } from "next/server";
import { ZodError } from "zod/v4";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  // If the error is already a Response (e.g., from requireRole/requireAuth), return it directly
  if (error instanceof Response || error instanceof NextResponse) {
    return error as NextResponse;
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation Error",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Prisma known errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; meta?: Record<string, unknown> };
    switch (prismaError.code) {
      case "P2002":
        return NextResponse.json(
          { error: "A record with this value already exists", field: prismaError.meta?.target },
          { status: 409 }
        );
      case "P2025":
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      default:
        return NextResponse.json(
          { error: "Database error" },
          { status: 500 }
        );
    }
  }

  // Generic error
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
