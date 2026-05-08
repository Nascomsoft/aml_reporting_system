import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AML database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.reportExport.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.caseAuditEntry.deleteMany();
  await prisma.caseDiscussion.deleteMany();
  await prisma.sTRSubmission.deleteMany();
  await prisma.aMLRule.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.case.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();

  console.log("  Cleared existing data");

  // ─── Create Institutions ─────────────────────────────────────────────
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
  const rules = await Promise.all([
    prisma.aMLRule.create({
      data: {
        name: "Large Cash Transaction",
        description: "Flag cash transactions exceeding threshold",
        ruleType: "THRESHOLD",
        threshold: 100000,
        severity: "HIGH",
        riskWeight: 3.0,
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
        riskWeight: 5.0,
        createdById: users[0].id,
      },
    }),
    prisma.aMLRule.create({
      data: {
        name: "Structuring Detection",
        description: "Multiple transactions just below reporting threshold",
        ruleType: "PATTERN",
        severity: "HIGH",
        riskWeight: 4.0,
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
        riskWeight: 5.0,
        createdById: users[0].id,
      },
    }),
    prisma.aMLRule.create({
      data: {
        name: "Dormant Account Activity",
        description: "Sudden activity on previously dormant account",
        ruleType: "PATTERN",
        severity: "MEDIUM",
        riskWeight: 2.5,
        createdById: users[0].id,
      },
    }),
    prisma.aMLRule.create({
      data: {
        name: "High-Risk Country Transfer",
        description: "Transfers involving FATF-listed jurisdictions",
        ruleType: "THRESHOLD",
        threshold: 10000,
        severity: "HIGH",
        riskWeight: 4.5,
        createdById: users[0].id,
      },
    }),
  ]);
  console.log(`  Created ${rules.length} AML rules`);

  // ─── Create Transactions ─────────────────────────────────────────────
  const txTypes = ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "WIRE", "CASH", "CHECK"] as const;
  const txStatuses = ["NORMAL", "FLAGGED", "UNDER_REVIEW", "CLEARED"] as const;
  const countries = ["Nigeria", "Ghana", "UK", "USA", "UAE", "Cameroon", "Benin", "Niger"];
  const customerNames = [
    "Chioma Okafor", "Emeka Nwosu", "Aisha Yusuf", "Titilayo Adeyemi",
    "Adebayo Oluwaseun", "Zainab Mohammed", "Ifeanyi Ezekiel", "Hana Okechukwu",
    "Tunde Adekunle", "Blessing Obi", "Mahmoud Ibrahim", "Hauwa Abubakar",
    "Olufemi Ogunleye", "Amara Onwuka", "Kayode Adeleke", "Fatima Hassan"
  ];

  const transactions = [];
  for (let i = 0; i < 200; i++) {
    const instIdx = i % institutions.length;
    const isFlagged = Math.random() > 0.7;
    const amount = isFlagged
      ? Math.floor(Math.random() * 500000) + 50000
      : Math.floor(Math.random() * 50000) + 100;

    transactions.push({
      transactionRef: `TXN-${String(i + 1).padStart(6, "0")}`,
      accountNumber: `ACC-${String(1000 + (i % 50)).padStart(7, "0")}`,
      customerName: customerNames[i % customerNames.length],
      amount,
      currency: "NGN",
      transactionType: txTypes[i % txTypes.length],
      country: countries[i % countries.length],
      riskScore: isFlagged ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 40),
      status: isFlagged ? txStatuses[1] : txStatuses[0],
      flagReason: isFlagged ? rules[i % rules.length].name : null,
      date: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
      institutionId: institutions[instIdx].id,
    });
  }

  const createdTxns = [];
  for (const tx of transactions) {
    createdTxns.push(await prisma.transaction.create({ data: tx }));
  }
  console.log(`  Created ${createdTxns.length} transactions`);

  // ─── Create Alerts ───────────────────────────────────────────────────
  const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  const lifecycleStages = ["NEW", "UNDER_REVIEW", "ESCALATED", "STR_SUBMITTED", "CLOSED"] as const;

  const alertTitles = [
    "Large cash deposit detected", "Rapid fund movement pattern", "Structuring activity suspected",
    "Circular transaction identified", "Dormant account reactivation", "High-risk country transfer",
    "Unusual wire transfer volume", "Multiple small deposits", "Cross-border suspicious activity",
    "Shell company transaction", "PEP-linked transfer", "Smurfing pattern detected",
    "Layering activity found", "Trade-based laundering signal", "Underground banking indicator",
    "Tax haven wire transfer", "Bulk cash smuggling pattern", "Funnel account activity",
    "Suspicious ATM usage", "Nominee account activity"
  ];

  const flaggedTxns = createdTxns.filter((t) => t.status === "FLAGGED");

  const alerts = [];
  for (let i = 0; i < 80; i++) {
    const instIdx = i % institutions.length;
    const severityIdx = i < 15 ? 0 : i < 35 ? 1 : i < 60 ? 2 : 3;
    const lifecycleIdx = i < 20 ? 0 : i < 40 ? 1 : i < 55 ? 2 : i < 65 ? 3 : 4;
    const linkedTx = flaggedTxns[i % flaggedTxns.length];

    alerts.push(
      await prisma.alert.create({
        data: {
          title: alertTitles[i % alertTitles.length],
          description: `Automated detection: ${alertTitles[i % alertTitles.length]} at ${institutions[instIdx].name}`,
          severity: severities[severityIdx],
          lifecycleStage: lifecycleStages[lifecycleIdx],
          riskScore: 100 - severityIdx * 20 - Math.floor(Math.random() * 15),
          amount: linkedTx.amount,
          customerName: linkedTx.customerName,
          accountNumber: linkedTx.accountNumber,
          ruleTriggered: rules[i % rules.length].name,
          institutionId: institutions[instIdx].id,
          slsRemaining: Math.max(0, 48 - i * 0.5),
          flagReason: rules[i % rules.length].description,
          country: linkedTx.country ?? "Ethiopia",
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000),
          transactionIds: [linkedTx.id],
        },
      })
    );
  }
  console.log(`  Created ${alerts.length} alerts`);

  // ─── Create Cases ────────────────────────────────────────────────────
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
  for (let i = 0; i < 7; i++) {
    const c = cases[i + 13]; // from STR_SUBMITTED and CLOSED cases
    const statuses = ["SUBMITTED", "UNDER_REVIEW", "CLOSED"] as const;
    const riskClassifications = i < 3 ? "CRITICAL" : "HIGH"; // Must be uppercase enum values for Prisma

    await prisma.sTRSubmission.create({
      data: {
        transactionSummary: `Suspicious transactions totaling NGN ${(Math.random() * 1000000).toFixed(0)} identified over a 30-day period`,
        customerName: c?.customer ?? customerNames[i],
        accountNumber: `ACC-${String(1000 + i).padStart(7, "0")}`,
        descriptionOfSuspicion: "Pattern consistent with layering and structuring activities detected through automated monitoring",
        rulesTriggered: [rules[i % rules.length].name, rules[(i + 1) % rules.length].name],
        transactionIds: [createdTxns[i].id],
        behavioralDeviations: ["Unusual transaction volume", "New beneficiary pattern", "Cross-border transfers to high-risk jurisdictions"],
        narrative: "The customer exhibited transaction patterns consistent with money laundering typologies. Multiple deposits were made just below the reporting threshold, followed by rapid wire transfers to offshore accounts.",
        riskClassification: riskClassifications,
        supportingDocuments: [],
        status: statuses[i % statuses.length],
        caseId: c?.id,
        submittedById: users[1].id,
        submittedDate: new Date(Date.now() - i * 86400000),
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

  console.log("  Created 8 STR submissions, including one end-to-end happy path");

  // ─── Create Activity Logs ───────────────────────────────────────────
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
