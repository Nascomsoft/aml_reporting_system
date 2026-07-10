import { Transaction, AlertSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateTransactionAgainstRules, FlagResult } from "@/lib/amlRuleEngine";

type ScreenableTransaction = Omit<Transaction, "createdAt">;

function normalizeSeverity(severity?: string): AlertSeverity {
  if (
    severity === "CRITICAL" ||
    severity === "HIGH" ||
    severity === "MEDIUM" ||
    severity === "LOW"
  ) {
    return severity;
  }

  return "MEDIUM";
}

export async function applyScreeningResult(
  transaction: ScreenableTransaction,
  flagResult: FlagResult
) {
  if (!flagResult.isFlagged) {
    return prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "CLEARED",
        riskScore: flagResult.riskScore,
        flagReason: null,
      },
      include: {
        institution: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  const alert = await prisma.alert.create({
    data: {
      title: `Flag: ${flagResult.ruleName ?? "AML rule"}`,
      description: `Transaction ${transaction.transactionRef} triggered ${flagResult.ruleName ?? "an AML rule"}`,
      severity: normalizeSeverity(flagResult.severity),
      lifecycleStage: "NEW",
      riskScore: flagResult.riskScore,
      amount: transaction.amount,
      customerName: transaction.customerName,
      accountNumber: transaction.accountNumber,
      occupation: transaction.occupation,
      ruleTriggered: flagResult.ruleName ?? "Unknown",
      institutionId: transaction.institutionId,
      flagReason: flagResult.ruleName ?? null,
      country: transaction.country,
      transactionIds: [transaction.id],
    },
  });

  return prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: "FLAGGED",
      riskScore: flagResult.riskScore,
      flagReason: flagResult.ruleName ?? null,
      alertIds: { push: alert.id },
    },
    include: {
      institution: {
        select: { id: true, name: true, code: true },
      },
    },
  });
}

export async function screenPersistedTransaction(transaction: ScreenableTransaction) {
  const flagResult = await evaluateTransactionAgainstRules(transaction);

  return applyScreeningResult(transaction, flagResult);
}
