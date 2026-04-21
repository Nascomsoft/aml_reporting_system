import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userLoginSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { createAuthToken } from "@/lib/jwt";
import { fromUserRole } from "@/lib/enumMaps";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = userLoginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { institution: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValidPassword = await compare(data.password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: fromUserRole(user.role),
      institutionId: user.institutionId,
      institutionName: user.institution?.name ?? null,
    };

    const token = createAuthToken(authUser);

    return NextResponse.json(
      {
        success: true,
        token,
        user: authUser,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
