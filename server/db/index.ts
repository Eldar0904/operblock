import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let client: ReturnType<typeof postgres> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!db) {
    client = postgres(process.env.DATABASE_URL, { max: 10 });
    db = drizzle(client, { schema });
  }

  return db;
}

export async function checkDbConnection(): Promise<boolean> {
  if (!isDbConfigured()) return false;

  try {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    await sql`SELECT 1`;
    await sql.end();
    return true;
  } catch {
    return false;
  }
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

export { schema };
