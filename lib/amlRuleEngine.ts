import { prisma } from "@/lib/prisma";
import { Transaction, AMLRule } from "@prisma/client";

export interface FlagResult {
  isFlagged: boolean;
  ruleName?: string;
  ruleId?: string;
  riskScore: number;
  severity?: string;
}

/**
 * Evaluates a transaction against all active AML rules
 * Returns flagging result with risk score calculation
 */
export async function evaluateTransactionAgainstRules(
  transaction: Omit<Transaction, "id" | "createdAt">
): Promise<FlagResult> {
  try {
    // Fetch all active rules
    const rules = await prisma.aMLRule.findMany({
      where: { isActive: true },
    });

    let highestRiskScore = 0;
    let flaggedRule: AMLRule | null = null;

    // Evaluate each rule
    for (const rule of rules) {
      const { triggered, riskScore } = evaluateSingleRule(rule, transaction);

      if (triggered && riskScore > highestRiskScore) {
        highestRiskScore = riskScore;
        flaggedRule = rule;
      }
    }

    // If no rule triggered, calculate base risk score
    if (!flaggedRule) {
      const baseRiskScore = calculateBaseRiskScore(transaction);
      return {
        isFlagged: false,
        riskScore: baseRiskScore,
      };
    }

    return {
      isFlagged: true,
      ruleName: flaggedRule.name,
      ruleId: flaggedRule.id,
      riskScore: highestRiskScore,
      severity: flaggedRule.severity,
    };
  } catch (error) {
    console.error("Error evaluating transaction against rules:", error);
    // Default to non-flagged with low risk if evaluation fails
    return {
      isFlagged: false,
      riskScore: calculateBaseRiskScore(transaction),
    };
  }
}

/**
 * Evaluates a single rule against a transaction
 */
function evaluateSingleRule(
  rule: AMLRule,
  transaction: Omit<Transaction, "id" | "createdAt">
): { triggered: boolean; riskScore: number } {
  let triggered = false;
  const baseRiskScore = calculateBaseRiskScore(transaction);

  if (rule.ruleType === "THRESHOLD") {
    triggered = evaluateThresholdRule(rule, transaction);
  } else if (rule.ruleType === "PATTERN") {
    // Pattern detection - simplified for now
    triggered = evaluatePatternRule(rule, transaction);
  } else if (rule.ruleType === "VELOCITY") {
    // Velocity detection - would need historical data in production
    triggered = evaluateVelocityRule(rule, transaction);
  }

  // Calculate risk score based on rule severity and weight
  const riskScore = triggered
    ? baseRiskScore +
      getSeverityWeight(rule.severity) * rule.riskWeight * 30 // 30 point base increment
    : baseRiskScore;

  return {
    triggered,
    riskScore: Math.min(riskScore, 100), // Cap at 100
  };
}

/**
 * Evaluates threshold-based rules (e.g., amount > X)
 */
function evaluateThresholdRule(
  rule: AMLRule,
  transaction: Omit<Transaction, "id" | "createdAt">
): boolean {
  if (!rule.threshold) return false;

  // Check if transaction amount exceeds threshold
  if (transaction.amount > rule.threshold) {
    return true;
  }

  return false;
}

/**
 * Evaluates pattern-based rules
 * Detects structuring, circular patterns, dormant account reactivation, etc.
 */
function evaluatePatternRule(
  rule: AMLRule,
  transaction: Omit<Transaction, "id" | "createdAt">
): boolean {
  const ruleName = rule.name.toLowerCase();

  // Structuring pattern: amounts just under common thresholds
  if (ruleName.includes("structuring")) {
    const suspiciousRange = transaction.amount >= 90000 && transaction.amount <= 99999;
    const deskAmount = transaction.amount >= 9000 && transaction.amount <= 9900;
    return suspiciousRange || deskAmount;
  }

  // High-risk country transfers
  if (ruleName.includes("high-risk") || ruleName.includes("country")) {
    const highRiskCountries = [
      "North Korea",
      "Iran",
      "Syria",
      "Cuba",
      "OFAC",
      "Sanctioned",
    ];
    return transaction.country
      ? highRiskCountries.some((country) =>
          transaction.country?.toLowerCase().includes(country.toLowerCase())
        )
      : false;
  }

  // Dormant account reactivation
  if (ruleName.includes("dormant")) {
    // In a real system, this would check account history
    // For simulation, we'll check if using random dormancy indicator
    return Math.random() < 0.05; // 5% chance for demo
  }

  // Circular transaction pattern
  if (ruleName.includes("circular")) {
    // Detect same customer sending and receiving in short time
    // For simulation, simple heuristic
    return !!(
      (transaction.transactionType === "TRANSFER" ||
        transaction.transactionType === "WIRE") &&
      transaction.metadata &&
      typeof transaction.metadata === "object" &&
      "circular" in transaction.metadata
    );
  }

  return false;
}

/**
 * Evaluates velocity-based rules (e.g., multiple transactions in short time)
 * In a real system, this would query recent history
 */
function evaluateVelocityRule(
  rule: AMLRule,
  transaction: Omit<Transaction, "id" | "createdAt">
): boolean {
  const ruleName = rule.name.toLowerCase();

  // Rapid fund movement - multiple transfers in quick succession
  if (ruleName.includes("rapid") || ruleName.includes("velocity")) {
    // In production, would check transaction history
    // For now, check if metadata indicates high velocity
    if (transaction.metadata && typeof transaction.metadata === "object") {
      const meta = transaction.metadata as { velocity?: number };
      return meta.velocity ? meta.velocity > 5 : false;
    }
  }

  return false;
}

/**
 * Calculates base risk score before rule evaluation
 * Takes into account natural risk factors
 */
function calculateBaseRiskScore(
  transaction: Omit<Transaction, "id" | "createdAt">
): number {
  let score = 0;

  // Amount-based scoring (non-threshold)
  if (transaction.amount > 1000000) score += 15;
  else if (transaction.amount > 500000) score += 10;
  else if (transaction.amount > 100000) score += 5;

  // Transaction type scoring
  const riskTransactionTypes = ["WIRE", "CASH", "CHECK"];
  if (riskTransactionTypes.includes(transaction.transactionType)) {
    score += 5;
  }

  // Country risk (basic)
  const riskCountries = [
    "Pakistan",
    "Nigeria",
    "Myanmar",
    "Zimbabwe",
    "Sudan",
  ];
  if (
    transaction.country &&
    riskCountries.some((country) =>
      transaction.country?.toLowerCase().includes(country.toLowerCase())
    )
  ) {
    score += 8;
  }

  return Math.min(score, 40); // Base score capped at 40
}

/**
 * Gets severity weight for risk calculation
 */
function getSeverityWeight(severity: string): number {
  const weights: Record<string, number> = {
    CRITICAL: 3,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 0.5,
  };
  return weights[severity?.toUpperCase()] || 1;
}

/**
 * Batch evaluate multiple transactions
 */
export async function evaluateTransactionsBatch(
  transactions: Array<Omit<Transaction, "id" | "createdAt">>
): Promise<FlagResult[]> {
  return Promise.all(
    transactions.map((txn) => evaluateTransactionAgainstRules(txn))
  );
}
