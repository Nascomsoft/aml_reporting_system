import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * DEBUG ENDPOINT - Check current session state
 * GET /api/auth/debug
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    // Get the session server-side
    const session = await auth();

    // Get cookies  
    const cookieHeader = request.headers.get("cookie");
    const allCookies = request.cookies.getAll();

    // Get important headers
    const host = request.headers.get("host");
    const xForwardedHost = request.headers.get("x-forwarded-host");
    const xForwardedProto = request.headers.get("x-forwarded-proto");
    const origin = request.headers.get("origin");

    console.log(`[${timestamp}] [DEBUG] Session check:`, {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: (session?.user as any)?.role,
    });

    return NextResponse.json(
      {
        timestamp,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
          vercelUrl: process.env.VERCEL_URL,
          vercelDeploymentId: process.env.VERCEL_DEPLOYMENT_ID,
        },
        nextAuthConfig: {
          nextAuthUrl: process.env.NEXTAUTH_URL,
          nextAuthSecretSet: !!process.env.NEXTAUTH_SECRET,
        },
        requestHeaders: {
          host,
          xForwardedHost,
          xForwardedProto,
          origin,
          userAgent: request.headers.get("user-agent")?.substring(0, 100),
        },
        cookies: {
          requestCookie: cookieHeader ? cookieHeader.substring(0, 200) : "none",
          allCookies: allCookies.length > 0 ? allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) })) : [],
        },
        session: {
          authenticated: !!session,
          user: session?.user,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        timestamp,
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
