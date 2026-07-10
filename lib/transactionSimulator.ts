import { Transaction, TransactionType, Institution } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { occupationCategories } from "./occupationCatalog";
import { applyScreeningResult } from "@/lib/amlScreening";

/**
 * Generate realistic transaction data for simulation
 */
export function generateRealisticTransaction(
  institution: Pick<Institution, "id">,
  options?: {
    customerName?: string;
    accountNumber?: string;
    amount?: number;
    occupation?: string;
    forceSuspicious?: boolean;
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
    "Zainab",
    "Temitope",
    "Nnamdi",
    "Hadiza",
  ];

  const customerLastNames = [
    "Okafor",
    "Mensah",
    "Hassan",
    "Ojomo",
    "Adeyemi",
    "Achebe",
    "Okonkwo",
    "Ibrahim",
    "Bello",
    "Balogun",
    "Abubakar",
    "Eze",
  ];

  // Generate amounts with realistic distribution
  // Most transactions between 10k-500k, some larger structural amounts
  let amount = options?.amount ?? generateAmount();

  const suspicious = options?.forceSuspicious ?? Math.random() < 0.3;
  let transactionType =
    transactionTypes[Math.floor(Math.random() * transactionTypes.length)];

  const accountNumber = options?.accountNumber ?? generateAccountNumber();
  const customerName =
    options?.customerName ??
    `${customerFirstNames[Math.floor(Math.random() * customerFirstNames.length)]} ${customerLastNames[Math.floor(Math.random() * customerLastNames.length)]}`;
  const occupation =
    options?.occupation ??
    occupationCategories[Math.floor(Math.random() * occupationCategories.length)];

  const transactionRef = generateTransactionRef();
  const country = "Nigeria";

  // Add metadata for pattern detection
  const metadata: Record<string, unknown> = {
    source: "simulator",
    generatedAt: new Date().toISOString(),
  };

  if (suspicious) {
    const pattern = Math.floor(Math.random() * 5);

    if (pattern === 0) {
      transactionType = "CASH";
      amount = Math.floor(Math.random() * 650000) + 125000;
      metadata.suspiciousPattern = "large_cash_transaction";
    } else if (pattern === 1) {
      amount = 90000 + Math.floor(Math.random() * 10000);
      metadata.suspiciousPattern = "structuring";
    } else if (pattern === 2) {
      transactionType = Math.random() < 0.5 ? "TRANSFER" : "WIRE";
      metadata.velocity = Math.floor(Math.random() * 7) + 6;
      amount = Math.floor(Math.random() * 350000) + 75000;
      metadata.suspiciousPattern = "rapid_fund_movement";
    } else if (pattern === 3) {
      transactionType = Math.random() < 0.5 ? "TRANSFER" : "WIRE";
      metadata.circular = true;
      amount = Math.floor(Math.random() * 500000) + 100000;
      metadata.suspiciousPattern = "circular_transaction";
    } else {
      metadata.dormantReactivation = true;
      amount = Math.floor(Math.random() * 300000) + 50000;
      metadata.suspiciousPattern = "dormant_account_reactivation";
    }
  } else {
    if (transactionType === "CASH" && amount > 95000) {
      amount = Math.floor(Math.random() * 85000) + 5000;
    }

    if (amount >= 90000 && amount <= 99999) {
      amount = Math.floor(Math.random() * 75000) + 10000;
    }

    if (amount >= 9000 && amount <= 9900) {
      amount = Math.floor(Math.random() * 65000) + 10000;
    }
  }

  return {
    transactionRef,
    accountNumber,
    customerName,
    occupation,
    amount,
    currency: "NGN",
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
  } else if (rand < 0.85) {
    // 35% between 100k-500k
    return Math.floor(Math.random() * 400000) + 100000;
  } else if (rand < 0.95) {
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
  const customerProfiles = await prisma.customerProfile.findMany({
    select: {
      accountNumber: true,
      customerName: true,
      occupation: true,
    },
  });

  const selectedCustomerProfile =
    customerProfiles.length > 0
      ? customerProfiles[Math.floor(Math.random() * customerProfiles.length)]
      : null;

  // Generate realistic transaction data
  const transaction = generateRealisticTransaction(
    institution,
    selectedCustomerProfile
      ? {
          customerName: selectedCustomerProfile.customerName,
          accountNumber: selectedCustomerProfile.accountNumber,
          occupation: selectedCustomerProfile.occupation,
        }
      : undefined
  );

  // Evaluate against rules
  const flagResult = await ruleEvaluator(transaction);

  const createdTransaction = await prisma.transaction.create({
    data: {
      ...transaction,
      status: "NORMAL",
      riskScore: 0,
      flagReason: null,
    },
  });

  return applyScreeningResult(createdTransaction, flagResult);
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
