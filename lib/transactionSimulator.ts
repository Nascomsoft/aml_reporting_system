import { Transaction, TransactionType, Institution } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Generate realistic transaction data for simulation
 */
export function generateRealisticTransaction(
  institution: Pick<Institution, "id">,
  options?: {
    customerName?: string;
    accountNumber?: string;
    amount?: number;
  }
): Omit<Transaction, "id" | "createdAt"> {
  const transactionTypes: TransactionType[] = [
    "DEPOSIT",
    "WITHDRAWAL",
    "TRANSFER",
    "WIRE",
    "CASH",
    "CHECK",
  ];

  const countries = [
    "Nigeria",
    "Ghana",
    "Kenya",
    "South Africa",
    "UAE",
    "UK",
    "USA",
    "Singapore",
    "Pakistan",
    "India",
    "Bangladesh",
    "Philippines",
    "Mexico",
  ];

  const customerFirstNames = [
    "Adekunle",
    "Chinedu",
    "Fatima",
    "Ibrahim",
    "Grace",
    "David",
    "Aisha",
    "Samuel",
    "Chioma",
    "Oluwaseun",
    "Amina",
    "Kwesi",
    "Asha",
    "Kofi",
    "Zainab",
  ];

  const customerLastNames = [
    "Okafor",
    "Mensah",
    "Hassan",
    "Ojomo",
    "Adeyemi",
    "Mwangi",
    "Patel",
    "Khan",
    "Achebe",
    "Okonwo",
    "Ibrahim",
    "Benin",
    "Kariuki",
  ];

  // Generate amounts with realistic distribution
  // Most transactions between 10k-500k, some larger structural amounts
  let amount = options?.amount ?? generateAmount();

  // Ensure diverse transaction types
  const transactionType =
    transactionTypes[Math.floor(Math.random() * transactionTypes.length)];

  // Sometimes generate suspicious structuring amounts (just under thresholds)
  if (Math.random() < 0.1) {
    // 10% chance of suspicious amount
    const thresholds = [100000, 50000, 10000];
    const baseThreshold =
      thresholds[Math.floor(Math.random() * thresholds.length)];
    amount = baseThreshold - Math.floor(Math.random() * 1000); // Just under threshold
  }

  const accountNumber = options?.accountNumber ?? generateAccountNumber();
  const customerName =
    options?.customerName ??
    `${customerFirstNames[Math.floor(Math.random() * customerFirstNames.length)]} ${customerLastNames[Math.floor(Math.random() * customerLastNames.length)]}`;

  const transactionRef = generateTransactionRef();
  const country =
    countries[Math.floor(Math.random() * countries.length)];

  // Add metadata for pattern detection
  const metadata: Record<string, unknown> = {
    source: "simulator",
    generatedAt: new Date().toISOString(),
  };

  // Sometimes mark as circular pattern
  if (Math.random() < 0.05) {
    metadata.circular = true;
  }

  // Sometimes mark as high velocity (for velocity rules)
  if (Math.random() < 0.08) {
    metadata.velocity = Math.floor(Math.random() * 10) + 3; // 3-12 transactions
  }

  return {
    transactionRef,
    accountNumber,
    customerName,
    amount,
    currency: "USD",
    transactionType,
    country,
    riskScore: 0, // Will be calculated by rule engine
    status: "NORMAL", // Will be updated by rule engine
    flagReason: null,
    date: new Date(),
    institutionId: institution.id,
    metadata: metadata as unknown as import("@prisma/client/runtime/library").JsonValue,
    alertIds: [],
  };
}

/**
 * Generate a realistic transaction amount
 * Distribution: Most transactions 10k-500k, some larger, few edge cases
 */
function generateAmount(): number {
  const rand = Math.random();

  if (rand < 0.5) {
    // 50% between 10k-100k
    return Math.floor(Math.random() * 90000) + 10000;
  } else if (rand < 0.35) {
    // 35% between 100k-500k
    return Math.floor(Math.random() * 400000) + 100000;
  } else if (rand < 0.1) {
    // 10% between 500k-2M
    return Math.floor(Math.random() * 1500000) + 500000;
  } else {
    // 5% very large transactions
    return Math.floor(Math.random() * 5000000) + 2000000;
  }
}

/**
 * Generate realistic account number (typically 10-16 digits)
 */
function generateAccountNumber(): string {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

/**
 * Generate realistic transaction reference
 * Format: TXN + timestamp + random suffix
 */
function generateTransactionRef(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `TXN${timestamp}${random}`;
}

/**
 * Simulate a single transaction end-to-end:
 * 1. Generate realistic data
 * 2. Evaluate against rules
 * 3. Create in database
 * 4. Return with flag details
 */
export async function simulateTransaction(
  institution: Pick<Institution, "id">,
  ruleEvaluator: (
    txn: Omit<Transaction, "id" | "createdAt">
  ) => Promise<{
    isFlagged: boolean;
    ruleName?: string;
    riskScore: number;
    severity?: string;
  }>
) {
  // Generate realistic transaction data
  const transaction = generateRealisticTransaction(institution);

  // Evaluate against rules
  const flagResult = await ruleEvaluator(transaction);

  // Create the transaction with flag results
  const createdTransaction = await prisma.transaction.create({
    data: {
      ...transaction,
      status: flagResult.isFlagged ? "FLAGGED" : "NORMAL",
      riskScore: flagResult.riskScore,
      flagReason: flagResult.ruleName || null,
    },
    include: {
      institution: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  // If flagged, optionally create an Alert
  if (flagResult.isFlagged) {
    await prisma.alert.create({
      data: {
        title: `Flag: ${flagResult.ruleName}`,
        description: `Transaction ${createdTransaction.transactionRef} triggered ${flagResult.ruleName}`,
        severity: (flagResult.severity || "MEDIUM") as Parameters<typeof prisma.alert.create>[0]["data"]["severity"],
        lifecycleStage: "NEW",
        riskScore: flagResult.riskScore,
        amount: createdTransaction.amount,
        customerName: createdTransaction.customerName,
        accountNumber: createdTransaction.accountNumber,
        ruleTriggered: flagResult.ruleName || "Unknown",
        institutionId: institution.id,
        flagReason: flagResult.ruleName,
        country: createdTransaction.country,
        transactionIds: [createdTransaction.id],
      },
    });
  }

  return createdTransaction;
}

/**
 * Generate multiple transactions for batch simulation
 */
export function generateTransactionBatch(
  institution: Pick<Institution, "id">,
  count: number = 10
): Array<Omit<Transaction, "id" | "createdAt">> {
  const transactions: Array<Omit<Transaction, "id" | "createdAt">> = [];

  for (let i = 0; i < count; i++) {
    transactions.push(generateRealisticTransaction(institution));
  }

  return transactions;
}

/**
 * Get a random simulation interval within the 5-10 second range
 */
export function getRandomInterval(): number {
  return Math.floor(Math.random() * 5000) + 5000; // 5000-10000ms
}
