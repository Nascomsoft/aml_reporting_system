import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { occupationCategories } from "../lib/occupationCatalog";

const prisma = new PrismaClient();
const SEEDED_TRANSACTION_COUNT = 650;
const SEEDED_FLAGGED_TRANSACTION_COUNT = Math.round(SEEDED_TRANSACTION_COUNT * 0.3);
const SEEDED_TRANSACTION_WINDOW_DAYS = 30;

const seededFlagReasons = [
  "Large Cash Transaction",
  "Rapid Fund Movement",
  "Structuring Detection",
  "Circular Transaction Pattern",
  "Dormant Account Activity",
] as const;

type AccountCustomerRecord = {
  accountNumber: string | null | undefined;
  customerName: string | null | undefined;
};

function assertUniqueAccountCustomerMapping(
  records: AccountCustomerRecord[],
  context: string
) {
  const accountToCustomer = new Map<string, string>();

  for (const record of records) {
    if (!record.accountNumber || !record.customerName) continue;

    const existingCustomer = accountToCustomer.get(record.accountNumber);
    if (existingCustomer && existingCustomer !== record.customerName) {
      throw new Error(
        `Seed integrity error in ${context}: account ${record.accountNumber} is mapped to both ${existingCustomer} and ${record.customerName}`
      );
    }

    accountToCustomer.set(record.accountNumber, record.customerName);
  }
}

function seededNormalAmount(transactionType: string): number {
  let amount = Math.floor(Math.random() * 500000) + 100;

  if (transactionType === "CASH" && amount > 95000) {
    amount = Math.floor(Math.random() * 85000) + 5000;
  }

  if (amount >= 90000 && amount <= 99999) {
    amount = Math.floor(Math.random() * 75000) + 10000;
  }

  if (amount >= 9000 && amount <= 9900) {
    amount = Math.floor(Math.random() * 65000) + 10000;
  }

  return amount;
}

function seededNormalRiskScore(amount: number, transactionType: string, index: number): number {
  let score = 4 + (index % 9);

  if (amount > 500000) score += 10;
  else if (amount > 100000) score += 5;

  if (["WIRE", "CASH", "CHECK"].includes(transactionType)) score += 5;

  return Math.min(score, 38);
}

function seededTransactionDate(index: number): Date {
  const now = new Date();
  const daysAgo = index % SEEDED_TRANSACTION_WINDOW_DAYS;
  const date = new Date(now);

  date.setDate(now.getDate() - daysAgo);
  date.setHours((index * 7) % 24, (index * 13) % 60, (index * 17) % 60, 0);

  return date;
}

function seededFlaggedTransactionShape(index: number): {
  amount: number;
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "WIRE" | "CASH" | "CHECK";
  riskScore: number;
  flagReason: (typeof seededFlagReasons)[number];
  metadata: Prisma.InputJsonObject;
} {
  const patternIndex = index % seededFlagReasons.length;
  const flagReason = seededFlagReasons[patternIndex];
  const metadata: Record<string, Prisma.InputJsonValue> = {
    source: "seed",
    suspiciousPattern: flagReason.toLowerCase().replaceAll(" ", "_"),
  };

  if (flagReason === "Large Cash Transaction") {
    return {
      amount: 125000 + ((index * 7919) % 650000),
      transactionType: "CASH",
      riskScore: 58 + (index % 18),
      flagReason,
      metadata: metadata as Prisma.InputJsonObject,
    };
  }

  if (flagReason === "Rapid Fund Movement") {
    metadata.velocity = 6 + (index % 7);
    return {
      amount: 75000 + ((index * 6151) % 350000),
      transactionType: index % 2 === 0 ? "TRANSFER" : "WIRE",
      riskScore: 72 + (index % 22),
      flagReason,
      metadata: metadata as Prisma.InputJsonObject,
    };
  }

  if (flagReason === "Structuring Detection") {
    return {
      amount: 90000 + (index % 10000),
      transactionType: index % 2 === 0 ? "DEPOSIT" : "TRANSFER",
      riskScore: 47 + (index % 17),
      flagReason,
      metadata: metadata as Prisma.InputJsonObject,
    };
  }

  if (flagReason === "Circular Transaction Pattern") {
    metadata.circular = true;
    return {
      amount: 100000 + ((index * 4567) % 500000),
      transactionType: index % 2 === 0 ? "TRANSFER" : "WIRE",
      riskScore: 78 + (index % 18),
      flagReason,
      metadata: metadata as Prisma.InputJsonObject,
    };
  }

  metadata.dormantReactivation = true;
  return {
    amount: 50000 + ((index * 3253) % 300000),
    transactionType: ["DEPOSIT", "WITHDRAWAL", "TRANSFER"][index % 3] as "DEPOSIT" | "WITHDRAWAL" | "TRANSFER",
    riskScore: 45 + (index % 15),
    flagReason,
    metadata: metadata as Prisma.InputJsonObject,
  };
}

function alertSeverityFromRiskScore(riskScore: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (riskScore >= 85) return "CRITICAL";
  if (riskScore >= 65) return "HIGH";
  if (riskScore >= 45) return "MEDIUM";
  return "LOW";
}

async function main() {
  console.log("🌱 Seeding AML database...");
  const runningStep = (step: string) => console.log(`▶ Running: ${step}`);

  // Clean existing data in dependency-safe order.
  runningStep("clearing existing data");
  await prisma.notification.deleteMany();
  await prisma.reportExport.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.caseAttachment.deleteMany();
  await prisma.caseAuditEntry.deleteMany();
  await prisma.caseDiscussion.deleteMany();
  await prisma.sTRSubmission.deleteMany();
  await prisma.aMLRule.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.case.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();

  console.log("  Cleared existing data");

  // ─── Create Institutions ─────────────────────────────────────────────
  runningStep("creating institutions");
  const institutions = await Promise.all([
    prisma.institution.create({
      data: { name: "Harbor Crest Bank", code: "HCB", region: "Lagos", riskScore: 45, branchCount: 220 },
    }),
    prisma.institution.create({
      data: { name: "Summit Gate Bank", code: "SGB", region: "Lagos", riskScore: 62, branchCount: 650 },
    }),
    prisma.institution.create({
      data: { name: "Crown Meridian Bank", code: "CMB", region: "South-West", riskScore: 78, branchCount: 480 },
    }),
    prisma.institution.create({
      data: { name: "Heritage Union Bank", code: "HUB", region: "South-South", riskScore: 55, branchCount: 720 },
    }),
    prisma.institution.create({
      data: { name: "Silver Maple Bank", code: "SMB", region: "North-Central", riskScore: 88, branchCount: 420 },
    }),
    prisma.institution.create({
      data: { name: "Continental Trust Bank", code: "CTB", region: "North-East", riskScore: 41, branchCount: 580 },
    }),
  ]);
  console.log(`  Created ${institutions.length} institutions`);

  // ─── Create Users ────────────────────────────────────────────────────
  runningStep("creating users");
  const hashedPw = await hash("password123", 12);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@aml.gov.ng",
        name: "System Administrator",
        password: hashedPw,
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        email: "officer@summitgate.com.ng",
        name: "Chioma Okonkwo",
        password: hashedPw,
        role: "REGULATOR",
        institutionId: institutions[1].id,
      },
    }),
    prisma.user.create({
      data: {
        email: "officer@crownmeridian.com.ng",
        name: "Aisha Musa",
        password: hashedPw,
        role: "REGULATOR",
        institutionId: institutions[2].id,
      },
    }),
    prisma.user.create({
      data: {
        email: "regulator@cbn.gov.ng",
        name: "Zainab Hassan",
        password: hashedPw,
        role: "REGULATOR",
        institutionId: institutions[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: "officer@heritageunion.com.ng",
        name: "Tunde Olusegun",
        password: hashedPw,
        role: "REGULATOR",
        institutionId: institutions[3].id,
      },
    }),
  ]);
  console.log(`  Created ${users.length} users`);

  // ─── Create AML Rules ───────────────────────────────────────────────
  runningStep("creating AML rules");
  const rules = await Promise.all([
    prisma.aMLRule.create({
      data: {
        name: "Large Cash Transaction",
        description: "Flag cash transactions exceeding threshold",
        ruleType: "THRESHOLD",
        threshold: 100000,
        severity: "HIGH",
        riskWeight: 2.2,
        createdById: users[0].id,
      },
    }),
    prisma.aMLRule.create({
      data: {
        name: "Rapid Fund Movement",
        description: "Multiple transfers within short period",
        ruleType: "VELOCITY",
        threshold: 5,
        severity: "CRITICAL",
        riskWeight: 2.8,
        createdById: users[0].id,
      },
    }),
    prisma.aMLRule.create({
      data: {
        name: "Structuring Detection",
        description: "Multiple transactions just below reporting threshold",
        ruleType: "PATTERN",
        severity: "HIGH",
        riskWeight: 2.0,
        condition: "amount > 90000 AND amount < 100000 AND count > 3",
        createdById: users[0].id,
      },
    }),
    prisma.aMLRule.create({
      data: {
        name: "Circular Transaction Pattern",
        description: "Funds returning to originator through intermediaries",
        ruleType: "PATTERN",
        severity: "CRITICAL",
        riskWeight: 2.6,
        createdById: users[0].id,
      },
    }),
    prisma.aMLRule.create({
      data: {
        name: "Dormant Account Activity",
        description: "Sudden activity on previously dormant account",
        ruleType: "PATTERN",
        severity: "MEDIUM",
        riskWeight: 1.8,
        createdById: users[0].id,
      },
    }),
    prisma.aMLRule.create({
      data: {
        name: "High-Risk Country Transfer",
        description: "Transfers involving FATF-listed jurisdictions",
        ruleType: "PATTERN",
        severity: "HIGH",
        riskWeight: 2.0,
        createdById: users[0].id,
      },
    }),
  ]);
  console.log(`  Created ${rules.length} AML rules`);

  // ─── Create Transactions ─────────────────────────────────────────────
  runningStep("creating transactions");
  const txTypes = ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "WIRE", "CASH", "CHECK"] as const;
  const customerProfiles = [
    { name: "Chioma Okafor", accountNumber: "ACC-0001000", occupation: occupationCategories[0] },
    { name: "Emeka Nwosu", accountNumber: "ACC-0001001", occupation: occupationCategories[1] },
    { name: "Aisha Yusuf", accountNumber: "ACC-0001002", occupation: occupationCategories[2] },
    { name: "Titilayo Adeyemi", accountNumber: "ACC-0001003", occupation: occupationCategories[3] },
    { name: "Adebayo Oluwaseun", accountNumber: "ACC-0001004", occupation: occupationCategories[4] },
    { name: "Zainab Mohammed", accountNumber: "ACC-0001005", occupation: occupationCategories[5] },
    { name: "Ifeanyi Ezekiel", accountNumber: "ACC-0001006", occupation: occupationCategories[6] },
    { name: "Hana Okechukwu", accountNumber: "ACC-0001007", occupation: occupationCategories[7] },
    { name: "Tunde Adekunle", accountNumber: "ACC-0001008", occupation: occupationCategories[8] },
    { name: "Blessing Obi", accountNumber: "ACC-0001009", occupation: occupationCategories[9] },
    { name: "Mahmoud Ibrahim", accountNumber: "ACC-0001010", occupation: occupationCategories[10] },
    { name: "Hauwa Abubakar", accountNumber: "ACC-0001011", occupation: occupationCategories[11] },
    { name: "Olufemi Ogunleye", accountNumber: "ACC-0001012", occupation: occupationCategories[0] },
    { name: "Amara Onwuka", accountNumber: "ACC-0001013", occupation: occupationCategories[2] },
    { name: "Kayode Adeleke", accountNumber: "ACC-0001014", occupation: occupationCategories[4] },
    { name: "Fatima Hassan", accountNumber: "ACC-0001015", occupation: occupationCategories[8] },
    { name: "Nneka Eze", accountNumber: "ACC-0001016", occupation: occupationCategories[1] },
    { name: "Sani Bello", accountNumber: "ACC-0001017", occupation: occupationCategories[5] },
    { name: "Yemi Balogun", accountNumber: "ACC-0001018", occupation: occupationCategories[7] },
    { name: "Mariam Abdullahi", accountNumber: "ACC-0001019", occupation: occupationCategories[10] },
    { name: "Kelechi Udo", accountNumber: "ACC-0001020", occupation: occupationCategories[11] },
    { name: "Bola Akinwale", accountNumber: "ACC-0001021", occupation: occupationCategories[0] },
    { name: "Hadiza Sani", accountNumber: "ACC-0001022", occupation: occupationCategories[3] },
    { name: "Chukwuma Nnamdi", accountNumber: "ACC-0001023", occupation: occupationCategories[6] },
    { name: "Rukayat Lawal", accountNumber: "ACC-0001024", occupation: occupationCategories[9] },
  ];
  const customerNames = customerProfiles.map((customer) => customer.name);
  const accountByCustomer = new Map(
    customerProfiles.map((customer) => [customer.name, customer.accountNumber])
  );

  await prisma.customerProfile.createMany({
    data: customerProfiles.map((customer) => ({
      customerName: customer.name,
      accountNumber: customer.accountNumber,
      occupation: customer.occupation,
    })),
  });

  const transactions = [];
  for (let i = 0; i < SEEDED_TRANSACTION_COUNT; i++) {
    const instIdx = i % institutions.length;
    const customerProfile = customerProfiles[i % customerProfiles.length];
    const isFlagged = i < SEEDED_FLAGGED_TRANSACTION_COUNT;
    const normalTransactionType = txTypes[i % txTypes.length];
    const suspiciousShape = isFlagged ? seededFlaggedTransactionShape(i) : null;
    const transactionType = suspiciousShape?.transactionType ?? normalTransactionType;
    const amount = suspiciousShape?.amount ?? seededNormalAmount(transactionType);
    const riskScore = suspiciousShape?.riskScore ?? seededNormalRiskScore(amount, transactionType, i);

    transactions.push({
      transactionRef: `TXN-${String(i + 1).padStart(6, "0")}`,
      accountNumber: customerProfile.accountNumber,
      customerName: customerProfile.name,
      amount,
      currency: "NGN",
      transactionType,
      country: "Nigeria",
      occupation: customerProfile.occupation,
      riskScore,
      status: isFlagged ? ("FLAGGED" as const) : ("NORMAL" as const),
      flagReason: suspiciousShape?.flagReason ?? null,
      date: seededTransactionDate(i),
      institutionId: institutions[instIdx].id,
      metadata: suspiciousShape?.metadata ?? ({ source: "seed" } satisfies Prisma.InputJsonObject),
    });
  }

  assertUniqueAccountCustomerMapping(transactions, "transaction payload generation");

  const createdTxns = [];
  for (const tx of transactions) {
    createdTxns.push(await prisma.transaction.create({ data: tx }));
  }
  console.log(`  Created ${createdTxns.length} transactions`);

  // ─── Create Alerts ───────────────────────────────────────────────────
  runningStep("creating alerts");
  const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  const lifecycleStages = ["NEW", "UNDER_REVIEW", "ESCALATED", "STR_SUBMITTED", "CLOSED"] as const;

  const alertTitles = [
    "Large cash transaction detected", "Rapid fund movement pattern", "Structuring activity suspected",
    "Circular transaction identified", "Dormant account reactivation", "Unusual wire transfer volume",
    "Multiple small deposits", "Layering activity found", "Trade-based laundering signal",
    "Funnel account activity", "Suspicious ATM usage", "Nominee account activity"
  ];

  const flaggedTxns = createdTxns.filter((t) => t.status === "FLAGGED");
  if (flaggedTxns.length !== SEEDED_FLAGGED_TRANSACTION_COUNT) {
    throw new Error(
      `Seed integrity error: expected ${SEEDED_FLAGGED_TRANSACTION_COUNT} flagged transactions but found ${flaggedTxns.length}`
    );
  }

  const alerts = [];
  for (let i = 0; i < 80; i++) {
    const lifecycleIdx = i < 20 ? 0 : i < 40 ? 1 : i < 55 ? 2 : i < 65 ? 3 : 4;
    const linkedTx = flaggedTxns[i % flaggedTxns.length];
    const alertSeverity = alertSeverityFromRiskScore(linkedTx.riskScore);
    const ruleTriggered = linkedTx.flagReason ?? seededFlagReasons[i % seededFlagReasons.length];

    alerts.push(
      await prisma.alert.create({
        data: {
          title: alertTitles[i % alertTitles.length],
          description: `Automated detection: ${ruleTriggered} at ${linkedTx.customerName}'s Nigerian account`,
          severity: alertSeverity,
          lifecycleStage: lifecycleStages[lifecycleIdx],
          riskScore: linkedTx.riskScore,
          amount: linkedTx.amount,
          customerName: linkedTx.customerName,
          accountNumber: linkedTx.accountNumber,
          occupation: linkedTx.occupation,
          ruleTriggered,
          institutionId: linkedTx.institutionId,
          slsRemaining: Math.max(0, 48 - i * 0.5),
          flagReason: ruleTriggered,
          country: "Nigeria",
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000),
          transactionIds: [linkedTx.id],
        },
      })
    );
  }
  console.log(`  Created ${alerts.length} alerts`);

  // ─── Create Cases ────────────────────────────────────────────────────
  runningStep("creating cases");
  const caseStatuses = ["NEW", "UNDER_REVIEW", "ESCALATED", "STR_SUBMITTED", "CLOSED"] as const;

  const cases = [];
  for (let i = 0; i < 20; i++) {
    const statusIdx = i < 5 ? 0 : i < 10 ? 1 : i < 14 ? 2 : i < 17 ? 3 : 4;
    const linkedAlertSet = alerts.slice(i * 4, i * 4 + 4);
    const investigatorIdx = (i % 3) + 1; // officers

    const c = await prisma.case.create({
      data: {
        caseNumber: `CASE-${String(i + 1).padStart(4, "0")}`,
        customer: linkedAlertSet[0]?.customerName ?? customerNames[i],
        riskLevel: severities[Math.min(i % 4, 3)],
        status: caseStatuses[statusIdx],
        escalationLevel: statusIdx >= 2 ? statusIdx - 1 : 0,
        complianceDeadline: new Date(Date.now() + (7 - i) * 86400000),
        slaRemainingHours: Math.max(0, 48 - i * 2),
        overdue: i > 15,
        summary: `Investigation case for suspicious activity by ${linkedAlertSet[0]?.customerName ?? customerNames[i]}`,
        investigatorId: users[investigatorIdx].id,
      },
    });

    // Link alerts to this case
    if (linkedAlertSet.length > 0) {
      await prisma.alert.updateMany({
        where: { id: { in: linkedAlertSet.map((a) => a.id) } },
        data: { caseId: c.id },
      });
    }

    cases.push(c);
  }
  console.log(`  Created ${cases.length} cases`);

  // ─── Create Case Discussions ─────────────────────────────────────────
  runningStep("creating case discussions");
  for (const c of cases.slice(0, 10)) {
    await prisma.caseDiscussion.createMany({
      data: [
        {
          caseId: c.id,
          user: users[1].name,
          message: "Initial review completed. Multiple red flags identified.",
          timestamp: new Date(Date.now() - 3 * 86400000),
        },
        {
          caseId: c.id,
          user: users[3].name,
          message: "Requesting additional transaction records from the institution.",
          timestamp: new Date(Date.now() - 2 * 86400000),
        },
        {
          caseId: c.id,
          user: users[1].name,
          message: "Additional records received. Escalation may be required.",
          timestamp: new Date(Date.now() - 1 * 86400000),
        },
      ],
    });
  }
  console.log("  Created case discussions");

  // ─── Create Case Audit Entries ───────────────────────────────────────
  runningStep("creating case audit entries");
  for (const c of cases.slice(0, 10)) {
    await prisma.caseAuditEntry.createMany({
      data: [
        {
          caseId: c.id,
          event: "Case created",
          user: "System",
          timestamp: new Date(Date.now() - 5 * 86400000),
          ip: "10.0.0.1",
        },
        {
          caseId: c.id,
          event: "Assigned to investigator",
          user: users[0].name,
          timestamp: new Date(Date.now() - 4 * 86400000),
          ip: "10.0.0.1",
        },
        {
          caseId: c.id,
          event: "Status changed to Under Review",
          user: users[1].name,
          timestamp: new Date(Date.now() - 3 * 86400000),
          ip: "10.0.0.2",
        },
      ],
    });
  }
  console.log("  Created case audit entries");

  // ─── Create STR Submissions ──────────────────────────────────────────
  runningStep("creating STR submissions");
  const SEEDED_STR_SUBMISSION_COUNT = 20;
  const SEEDED_DRAFT_STR_COUNT = 3;

  for (let i = 0; i < SEEDED_STR_SUBMISSION_COUNT - 1; i++) {
    const c = cases[i + 13]; // from STR_SUBMITTED and CLOSED cases
    const statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CLOSED"] as const;
    const status = i < SEEDED_DRAFT_STR_COUNT ? statuses[0] : statuses[(i % 3) + 1];
    const riskClassifications = i < 3 ? "CRITICAL" : "HIGH"; // Must be uppercase enum values for Prisma
    const strCustomerName = c?.customer ?? customerNames[i];
    const strAccountNumber =
      accountByCustomer.get(strCustomerName) ?? customerProfiles[i % customerProfiles.length].accountNumber;

    await prisma.sTRSubmission.create({
      data: {
        transactionSummary: `Suspicious transactions totaling NGN ${(Math.random() * 1000000).toFixed(0)} identified over a 30-day period`,
        customerName: strCustomerName,
        accountNumber: strAccountNumber,
        descriptionOfSuspicion: "Pattern consistent with layering and structuring activities detected through automated monitoring",
        rulesTriggered: [rules[i % rules.length].name, rules[(i + 1) % rules.length].name],
        transactionIds: [createdTxns[i].id],
        behavioralDeviations: ["Unusual transaction volume", "New beneficiary pattern", "Rapid domestic fund movement"],
        narrative: "The customer exhibited transaction patterns consistent with money laundering typologies. Multiple deposits were made just below the reporting threshold, followed by rapid domestic transfers across Nigerian accounts.",
        riskClassification: riskClassifications,
        supportingDocuments: [],
        status,
        caseId: c?.id,
        submittedById: users[1].id,
        submittedDate: status === "DRAFT" ? null : new Date(Date.now() - i * 86400000),
      },
    });
  }

  const happyPathCase = cases[0];
  const happyPathAlerts = alerts.slice(0, 2);
  const happyPathTransactionIds = Array.from(
    new Set(happyPathAlerts.flatMap((alert) => alert.transactionIds))
  );

  await prisma.case.update({
    where: { id: happyPathCase.id },
    data: {
      status: "STR_SUBMITTED",
      escalationLevel: 2,
      summary:
        "End-to-end workflow case: alert triaged, investigation completed, escalated, and submitted as an STR.",
    },
  });

  await prisma.alert.updateMany({
    where: { id: { in: happyPathAlerts.map((alert) => alert.id) } },
    data: {
      lifecycleStage: "STR_SUBMITTED",
      caseId: happyPathCase.id,
    },
  });

  await prisma.caseDiscussion.create({
    data: {
      caseId: happyPathCase.id,
      user: users[1].name,
      message:
        "Seeded happy path note: linked alerts reviewed and STR submission prepared from case evidence.",
      timestamp: new Date(Date.now() - 2 * 3600000),
    },
  });

  await prisma.caseAuditEntry.createMany({
    data: [
      {
        caseId: happyPathCase.id,
        event: "Alert linked to case",
        user: users[1].name,
        timestamp: new Date(Date.now() - 4 * 3600000),
      },
      {
        caseId: happyPathCase.id,
        event: "Case escalated to regulator",
        user: users[1].name,
        details: "Seeded happy path escalation",
        timestamp: new Date(Date.now() - 3 * 3600000),
      },
      {
        caseId: happyPathCase.id,
        event: "STR submitted from case",
        user: users[1].name,
        timestamp: new Date(Date.now() - 1 * 3600000),
      },
    ],
  });

  await prisma.sTRSubmission.create({
    data: {
      transactionSummary:
        "Seeded happy-path STR created from two linked alerts and their suspicious transactions.",
      customerName: happyPathCase.customer,
      accountNumber: happyPathAlerts[0].accountNumber ?? "ACC-HAPPY-PATH",
      descriptionOfSuspicion:
        "Investigation found rapid fund movement and structuring indicators across linked alerts.",
      rulesTriggered: happyPathAlerts.map((alert) => alert.ruleTriggered),
      transactionIds: happyPathTransactionIds,
      behavioralDeviations: [
        "Alert-driven escalation from new to under review",
        "Case discussion documented investigation findings",
        "Escalated case submitted as STR",
      ],
      narrative:
        "This seeded STR demonstrates the persisted alert-to-case-to-STR workflow. The linked alerts were triaged, assigned to a case, discussed by an investigator, escalated, and submitted with transaction references retained.",
      riskClassification: happyPathCase.riskLevel,
      supportingDocuments: [],
      status: "SUBMITTED",
      caseId: happyPathCase.id,
      submittedById: users[1].id,
      submittedDate: new Date(Date.now() - 30 * 60000),
    },
  });

  console.log(
    `  Created ${SEEDED_STR_SUBMISSION_COUNT} STR submissions, including one end-to-end happy path and ${SEEDED_DRAFT_STR_COUNT} draft`
  );

  // ─── Create Activity Logs ───────────────────────────────────────────
  runningStep("creating activity logs");
  const logActions = ["LOGIN", "ALERT_UPDATE", "CASE_CREATE", "CASE_UPDATE", "STR_SUBMIT", "EXPORT"];
  for (let i = 0; i < 50; i++) {
    await prisma.activityLog.create({
      data: {
        userId: users[i % users.length].id,
        action: logActions[i % logActions.length],
        resource: i % 3 === 0 ? "alert" : i % 3 === 1 ? "case" : "str",
        resourceId: `resource-${i}`,
        ip: `10.0.${Math.floor(i / 10)}.${(i % 10) + 1}`,
        timestamp: new Date(Date.now() - i * 3600000),
      },
    });
  }
  console.log("  Created 50 activity logs");

  // ─── Create Notifications ───────────────────────────────────────────
  runningStep("creating notifications");
  for (const user of users.slice(1)) {
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          title: "New High-Risk Alert",
          message: "A critical alert has been generated for your institution",
          severity: "CRITICAL",
          link: "/alert_management",
        },
        {
          userId: user.id,
          title: "SLA Approaching",
          message: "Case CASE-0003 SLA deadline is in 2 hours",
          severity: "HIGH",
          link: "/case_management",
        },
        {
          userId: user.id,
          title: "STR Review Complete",
          message: "Your submitted STR has been reviewed by the regulator",
          severity: "MEDIUM",
          isRead: true,
        },
      ],
    });
  }
  console.log("  Created notifications");

  runningStep("validating account/customer mapping integrity");
  const [transactionMappings, alertMappings, strMappings] = await Promise.all([
    prisma.transaction.findMany({
      select: { accountNumber: true, customerName: true },
    }),
    prisma.alert.findMany({
      where: { accountNumber: { not: null } },
      select: { accountNumber: true, customerName: true },
    }),
    prisma.sTRSubmission.findMany({
      select: { accountNumber: true, customerName: true },
    }),
  ]);

  assertUniqueAccountCustomerMapping(transactionMappings, "transactions in database");
  assertUniqueAccountCustomerMapping(alertMappings, "alerts in database");
  assertUniqueAccountCustomerMapping(strMappings, "STR submissions in database");
  assertUniqueAccountCustomerMapping(
    [...transactionMappings, ...alertMappings, ...strMappings],
    "combined seeded account/customer records"
  );
  console.log("  Verified unique account-to-customer mappings across seeded records");

  console.log("\n✅ Database seeded successfully!");
  console.log("\n📋 Login credentials:");
  console.log("  Admin:      admin@aml.gov.ng / password123");
  console.log("  Officer:    officer@summitgate.com.ng / password123");
  console.log("  Officer 2:  officer@crownmeridian.com.ng / password123");
  console.log("  Regulator:  regulator@cbn.gov.ng / password123");
  console.log("  Officer 3:  officer@heritageunion.com.ng / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
