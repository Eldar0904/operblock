import "dotenv/config";

type Check = { name: string; ok: boolean; detail: string };

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  return value.includes("...") || value.includes("user:password");
}

async function checkDb(): Promise<Check> {
  const url = process.env.DATABASE_URL;
  if (isPlaceholder(url)) {
    return { name: "PostgreSQL", ok: false, detail: "DATABASE_URL not configured in .env" };
  }

  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url!, { max: 1 });
    await sql`SELECT 1`;
    await sql.end();
    return { name: "PostgreSQL", ok: true, detail: "Connected successfully" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return { name: "PostgreSQL", ok: false, detail: msg };
  }
}

async function main() {
  const checks: Check[] = [];

  const clerkPub = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  const clerkSecret = process.env.CLERK_SECRET_KEY;
  const clerkPubBackend = process.env.CLERK_PUBLISHABLE_KEY;

  checks.push({
    name: "Clerk (frontend)",
    ok: !isPlaceholder(clerkPub),
    detail: isPlaceholder(clerkPub)
      ? "Set VITE_CLERK_PUBLISHABLE_KEY in .env"
      : "Publishable key configured",
  });

  checks.push({
    name: "Clerk (backend)",
    ok: !isPlaceholder(clerkSecret) && !isPlaceholder(clerkPubBackend),
    detail:
      isPlaceholder(clerkSecret) || isPlaceholder(clerkPubBackend)
        ? "Set CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY in .env"
        : "Secret + publishable keys configured",
  });

  checks.push(await checkDb());

  console.log("\nOperBlock setup check\n");
  for (const check of checks) {
    const icon = check.ok ? "✓" : "✗";
    console.log(`  ${icon} ${check.name}: ${check.detail}`);
  }

  const allOk = checks.every((c) => c.ok);
  console.log(allOk ? "\nAll checks passed — run npm run dev\n" : "\nFix the items above, then re-run: npm run setup:check\n");
  process.exit(allOk ? 0 : 1);
}

main();
