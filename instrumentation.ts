export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAmlScanner } = await import("@/lib/amlScanner");

    startAmlScanner();
  }
}
