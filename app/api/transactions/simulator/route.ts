import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { evaluateTransactionAgainstRules } from "@/lib/amlRuleEngine";
import { simulateTransaction, getRandomInterval } from "@/lib/transactionSimulator";
import { handleApiError } from "@/lib/errorHandler";

// In-memory store for simulation state
// In production, use Redis or database for multi-server setup
const simulationState: Record<
  string,
  {
    isRunning: boolean;
    isPaused: boolean;
    interval: NodeJS.Timeout | null;
    institutionId: string;
    startedAt: Date;
  }
> = {};

/**
 * POST handler for simulation control commands
 * Actions: start, stop, pause, resume
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    // Only admins can control simulations
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    const stateKey = user.institutionId || "global";

    if (action === "start") {
      return startSimulation(user.institutionId || null, stateKey);
    } else if (action === "stop") {
      return stopSimulation(stateKey);
    } else if (action === "pause") {
      return pauseSimulation(stateKey);
    } else if (action === "resume") {
      return resumeSimulation(stateKey);
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET handler for SSE streaming of transactions
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    // Only allow admins and regulators to view real-time stream
    if (user.role !== "admin" && (user.role !== "regulator" || !user.institutionId)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Determine which institution to stream for
    const institutionId = user.role === "admin" ? null : user.institutionId;

    // Create SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Send initial connection message
          const initialMessage = {
            type: "connected",
            timestamp: new Date().toISOString(),
            message: "SSE stream established",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
          );

          // Simulation loop
          const runSimulation = async () => {
            // Check if still paused/running
            const stateKey = institutionId || "global";
            const state = simulationState[stateKey];

            if (!state || !state.isRunning) {
              // Schedule next check
              setTimeout(runSimulation, 2000);
              return;
            }

            if (state.isPaused) {
              // Send pause notification
              const pauseMsg = {
                type: "status",
                status: "paused",
                timestamp: new Date().toISOString(),
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(pauseMsg)}\n\n`)
              );

              // Check again later
              setTimeout(runSimulation, 2000);
              return;
            }

            try {
              // Get institution for simulation
              const institution = institutionId
                ? await prisma.institution.findUnique({
                    where: { id: institutionId },
                  })
                : (await prisma.institution.findFirst({})); // Use first institution if no filter

              if (!institution) {
                const errorMsg = {
                  type: "error",
                  error: "No institution found",
                  timestamp: new Date().toISOString(),
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorMsg)}\n\n`)
                );
                return;
              }

              // Simulate and evaluate a transaction
              const transaction = await simulateTransaction(
                { id: institution.id },
                evaluateTransactionAgainstRules
              );

              // Send transaction through SSE
              const transactionData = {
                type: "transaction",
                data: {
                  id: transaction.id,
                  transactionRef: transaction.transactionRef,
                  customerName: transaction.customerName,
                  accountNumber: transaction.accountNumber,
                  amount: transaction.amount,
                  currency: transaction.currency,
                  transactionType: transaction.transactionType,
                  country: transaction.country,
                  riskScore: transaction.riskScore,
                  status: transaction.status,
                  flagReason: transaction.flagReason,
                  date: transaction.date.toISOString(),
                  institution: transaction.institution,
                },
                timestamp: new Date().toISOString(),
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(transactionData)}\n\n`)
              );

              // Schedule next transaction with random interval
              const nextInterval = getRandomInterval();
              setTimeout(runSimulation, nextInterval);
            } catch (error) {
              console.error("Error during simulation:", error);
              const errorMsg = {
                type: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Simulation error occurred",
                timestamp: new Date().toISOString(),
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorMsg)}\n\n`)
              );

              // Continue simulation despite error
              setTimeout(
                runSimulation,
                getRandomInterval()
              );
            }
          };

          // Start the simulation loop
          runSimulation();

          // Clean up on connection close
          request.signal.addEventListener("abort", () => {
            controller.close();
          });
        } catch (error) {
          console.error("SSE error:", error);
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Start the simulation
 */
function startSimulation(institutionId: string | null, stateKey: string) {
  if (simulationState[stateKey]?.isRunning) {
    return NextResponse.json(
      { error: "Simulation already running" },
      { status: 409 }
    );
  }

  simulationState[stateKey] = {
    isRunning: true,
    isPaused: false,
    interval: null,
    institutionId: institutionId || "",
    startedAt: new Date(),
  };

  return NextResponse.json({
    status: "started",
    timestamp: new Date().toISOString(),
    stateKey,
  });
}

/**
 * Stop the simulation
 */
function stopSimulation(stateKey: string) {
  const state = simulationState[stateKey];

  if (!state) {
    return NextResponse.json(
      { error: "Simulation not found" },
      { status: 404 }
    );
  }

  if (state.interval) {
    clearInterval(state.interval);
  }

  delete simulationState[stateKey];

  return NextResponse.json({
    status: "stopped",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Pause the simulation
 */
function pauseSimulation(stateKey: string) {
  const state = simulationState[stateKey];

  if (!state) {
    return NextResponse.json(
      { error: "Simulation not found" },
      { status: 404 }
    );
  }

  state.isPaused = true;

  return NextResponse.json({
    status: "paused",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Resume the simulation
 */
function resumeSimulation(stateKey: string) {
  const state = simulationState[stateKey];

  if (!state) {
    return NextResponse.json(
      { error: "Simulation not found" },
      { status: 404 }
    );
  }

  state.isPaused = false;

  return NextResponse.json({
    status: "resumed",
    timestamp: new Date().toISOString(),
  });
}
