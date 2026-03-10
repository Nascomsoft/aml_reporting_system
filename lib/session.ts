import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Extend the session user type
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  institutionId: string | null;
  institutionName: string | null;
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
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
