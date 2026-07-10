import "server-only";

import { prisma } from "@/lib/prisma";
import { screenPersistedTransaction } from "@/lib/amlScreening";

const AML_SCAN_INTERVAL_MS = 60_000;
const AML_SCAN_BATCH_SIZE = 25;

type AmlScannerGlobal = typeof globalThis & {
  amlScanner?: {
    interval: NodeJS.Timeout;
    isScanning: boolean;
  };
};

const scannerGlobal = globalThis as AmlScannerGlobal;

async function scanNormalTransactions() {
  const scanner = scannerGlobal.amlScanner;

  if (!scanner || scanner.isScanning) {
    return;
  }

  scanner.isScanning = true;

  try {
    const transactions = await prisma.transaction.findMany({
      where: { status: "NORMAL" },
      orderBy: { date: "asc" },
      take: AML_SCAN_BATCH_SIZE,
    });

    for (const transaction of transactions) {
      await screenPersistedTransaction(transaction);
    }
  } catch (error) {
    console.error("AML scanner failed:", error);
  } finally {
    scanner.isScanning = false;
  }
}

export function startAmlScanner() {
  if (scannerGlobal.amlScanner) {
    return;
  }

  scannerGlobal.amlScanner = {
    interval: setInterval(scanNormalTransactions, AML_SCAN_INTERVAL_MS),
    isScanning: false,
  };

  void scanNormalTransactions();
}
