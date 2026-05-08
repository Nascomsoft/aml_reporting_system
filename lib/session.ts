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

async function getBearerToken(request?: Request): Promise<string | null> {
  if (request) {
    const authorization = request.headers.get("authorization") || request.headers.get("Authorization");

    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice(7).trim();
    }

    const tokenHeader = request.headers.get("x-auth-token");
    if (tokenHeader) {
      return tokenHeader.trim();
    }

    const url = new URL(request.url);
    const queryToken = url.searchParams.get("authToken");
    if (queryToken) {
      return queryToken.trim();
    }

    return null;
  }

  const { headers } = await import("next/headers");
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

function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getSessionUser(request?: Request): Promise<SessionUser | null> {
  const token = await getBearerToken(request);

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
export async function requireAuth(request?: Request): Promise<SessionUser> {
  const user = await getSessionUser(request);
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
  const allowedRoles = roles.map(normalizeRole);

  if (!allowedRoles.includes(normalizeRole(user.role))) {
    throw NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }
  return user;
}
