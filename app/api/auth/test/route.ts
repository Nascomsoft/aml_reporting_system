import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import { fromUserRole } from "@/lib/enumMaps";

/**
 * GET /api/auth/test
 * Diagnostic endpoint to test database connectivity and authentication flow
 * 
 * Query parameters:
 * - email: Email to test (optional, defaults to 'officer@bank.com')
 * - password: Password to test (optional, defaults to 'password')
 * - dbOnly: If 'true', only test database connectivity (no auth attempt)
 * 
 * WARNING: This endpoint should only be used for debugging in development/staging.
 * MUST be removed or secured in production!
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const testEmail = searchParams.get("email") || "officer@bank.com";
  const testPassword = searchParams.get("password") || "password";
  const dbOnly = searchParams.get("dbOnly") === "true";

  const results = {
    timestamp,
    environment: process.env.NODE_ENV || "unknown",
    nextAuthUrl: process.env.NEXTAUTH_URL || "NOT SET",
    nextAuthSecret: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
    databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT SET",
    tests: [] as Array<{
      name: string;
      status: "✓" | "✗" | "⚠️";
      details: string;
      duration: number;
      error?: string;
    }>,
  };

  /**
   * Test 1: Database connectivity
   */
  const dbStart = Date.now();
  try {
    console.log(`[${timestamp}] [TEST] Testing database connectivity...`);
    // Test database connectivity by counting users
    await prisma.user.count();

    results.tests.push({
      name: "Database Connectivity",
      status: "✓",
      details: "Successfully connected to database and executed test query",
      duration: Date.now() - dbStart,
    });
    console.log(`[${timestamp}] [TEST] ✓ Database connectivity test passed`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.push({
      name: "Database Connectivity",
      status: "✗",
      details: "Failed to connect to database",
      duration: Date.now() - dbStart,
      error: errorMsg,
    });
    console.error(`[${timestamp}] [TEST] ✗ Database connectivity test failed:`, errorMsg);

    return NextResponse.json(results, { status: 503 });
  }

  // If dbOnly flag is set, return here
  if (dbOnly) {
    return NextResponse.json(results, { status: 200 });
  }

  /**
   * Test 2: Find user in database
   */
  const userStart = Date.now();
  let user = null;
  try {
    console.log(`[${timestamp}] [TEST] Looking up user: ${testEmail}`);
    user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { institution: true },
    });

    if (user) {
      results.tests.push({
        name: "User Lookup",
        status: "✓",
        details: `User found: ${user.email}, isActive: ${user.isActive}, role: ${user.role}`,
        duration: Date.now() - userStart,
      });
      console.log(`[${timestamp}] [TEST] ✓ User found in database`);
    } else {
      results.tests.push({
        name: "User Lookup",
        status: "✗",
        details: `User not found in database: ${testEmail}`,
        duration: Date.now() - userStart,
      });
      console.log(`[${timestamp}] [TEST] ✗ User not found: ${testEmail}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.push({
      name: "User Lookup",
      status: "✗",
      details: "Failed to query user from database",
      duration: Date.now() - userStart,
      error: errorMsg,
    });
    console.error(`[${timestamp}] [TEST] ✗ User lookup failed:`, errorMsg);
  }

  if (!user) {
    return NextResponse.json(results, { status: 200 });
  }

  /**
   * Test 3: Check user active status
   */
  const activeStart = Date.now();
  if (user.isActive) {
    results.tests.push({
      name: "User Active Status",
      status: "✓",
      details: "User account is active",
      duration: Date.now() - activeStart,
    });
    console.log(`[${timestamp}] [TEST] ✓ User is active`);
  } else {
    results.tests.push({
      name: "User Active Status",
      status: "✗",
      details: "User account is inactive",
      duration: Date.now() - activeStart,
    });
    console.log(`[${timestamp}] [TEST] ✗ User is inactive`);
    return NextResponse.json(results, { status: 200 });
  }

  /**
   * Test 4: Password comparison
   */
  const passwordStart = Date.now();
  try {
    console.log(`[${timestamp}] [TEST] Comparing password for user...`);
    const isValid = await compare(testPassword, user.password);

    if (isValid) {
      results.tests.push({
        name: "Password Validation",
        status: "✓",
        details: "Password matches hash in database",
        duration: Date.now() - passwordStart,
      });
      console.log(`[${timestamp}] [TEST] ✓ Password validation passed`);
    } else {
      results.tests.push({
        name: "Password Validation",
        status: "✗",
        details: "Password does not match hash in database",
        duration: Date.now() - passwordStart,
      });
      console.log(`[${timestamp}] [TEST] ✗ Password validation failed`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.push({
      name: "Password Validation",
      status: "✗",
      details: "Failed to validate password",
      duration: Date.now() - passwordStart,
      error: errorMsg,
    });
    console.error(`[${timestamp}] [TEST] ✗ Password validation error:`, errorMsg);
  }

  /**
   * Test 5: Simulate full credentials provider flow
   */
  const flowStart = Date.now();
  try {
    console.log(`[${timestamp}] [TEST] Simulating full authentication flow...`);

    // Step 1: Validate input
    if (!testEmail || !testPassword) {
      throw new Error("Missing email or password");
    }

    // Step 2: Find user
    const flowUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { institution: true },
    });

    if (!flowUser || !flowUser.isActive) {
      throw new Error("User not found or inactive");
    }

    // Step 3: Validate password
    const passwordValid = await compare(testPassword, flowUser.password);
    if (!passwordValid) {
      throw new Error("Invalid password");
    }

    // Step 4: Attempt lastLogin update (to verify write permissions)
    await prisma.user.update({
      where: { id: flowUser.id },
      data: { lastLogin: new Date() },
    });

    // Step 5: Return user object like credentials provider would
    const returnUser = {
      id: flowUser.id,
      email: flowUser.email,
      name: flowUser.name,
      role: fromUserRole(flowUser.role),
      institutionId: flowUser.institutionId,
      institutionName: flowUser.institution?.name ?? null,
    };

    results.tests.push({
      name: "Full Authentication Flow",
      status: "✓",
      details: `Credentials provider flow simulation successful. User: ${returnUser.id}, Role: ${returnUser.role}`,
      duration: Date.now() - flowStart,
    });
    console.log(`[${timestamp}] [TEST] ✓ Full authentication flow successful`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.push({
      name: "Full Authentication Flow",
      status: "✗",
      details: "Authentication flow failed",
      duration: Date.now() - flowStart,
      error: errorMsg,
    });
    console.error(`[${timestamp}] [TEST] ✗ Authentication flow failed:`, errorMsg);
  }

  /**
   * Summary
   */
  const allPassed = results.tests.every((t) => t.status === "✓");
  results.tests.push({
    name: "Summary",
    status: allPassed ? "✓" : "⚠️",
    details: allPassed
      ? "All tests passed. Authentication should work correctly."
      : "Some tests failed. Check details above for issues.",
    duration: 0,
  });

  return NextResponse.json(results, { status: 200 });
}

/**
 * POST /api/auth/test
 * Manual test of credentials provider (for testing with custom credentials)
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const body = await request.json();
    const { email, password } = body;

    const results = {
      timestamp,
      email: email ? email.substring(0, 3) + "***" : "unknown",
      status: "pending",
      details: [] as string[],
    };

    if (!email || !password) {
      results.status = "error";
      results.details.push("Email and password are required");
      return NextResponse.json(results, { status: 400 });
    }

    console.log(`[${timestamp}] [TEST:POST] Testing with provided credentials`);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { institution: true },
    });

    if (!user) {
      results.status = "error";
      results.details.push("User not found");
      return NextResponse.json(results, { status: 401 });
    }

    if (!user.isActive) {
      results.status = "error";
      results.details.push("User account is inactive");
      return NextResponse.json(results, { status: 401 });
    }

    // Validate password
    const isValid = await compare(password, user.password);
    if (!isValid) {
      results.status = "error";
      results.details.push("Invalid password");
      return NextResponse.json(results, { status: 401 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    results.status = "success";
    results.details.push("Authentication successful");
    results.details.push(`User ID: ${user.id}`);
    results.details.push(`Role: ${user.role}`);
    results.details.push(`Institution: ${user.institution?.name || "None"}`);

    console.log(`[${timestamp}] [TEST:POST] ✓ Authentication successful`);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    const timestamp = new Date().toISOString();
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    console.error(`[${timestamp}] [TEST:POST] Error:`, errorMsg);

    return NextResponse.json(
      { timestamp, status: "error", details: [errorMsg] },
      { status: 500 }
    );
  }
}
