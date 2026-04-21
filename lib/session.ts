import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/jwt";

// Extend the session user type
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  institutionId: string | null;
  institutionName: string | null;
}

async function getBearerToken(): Promise<string | null> {
  const headerList = await headers();
  const authorization = headerList.get("authorization") || headerList.get("Authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  const tokenHeader = headerList.get("x-auth-token");
  if (tokenHeader) {
    return tokenHeader.trim();
  }

  return null;
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getBearerToken();

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    institutionId: payload.institutionId,
    institutionName: payload.institutionName,
  };
}

/**
 * Require authentication. Returns the user or throws a 401 response.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

/**
 * Require a specific role. Returns the user or throws a 403 response.
 */
export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }
  return user;
}
