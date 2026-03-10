import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { userSignupSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { toUserRole } from "@/lib/enumMaps";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = userSignupSchema.parse(body);

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: toUserRole(data.role),
        institutionId: data.institutionId || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
