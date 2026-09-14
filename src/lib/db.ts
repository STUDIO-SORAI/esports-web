import { createClient, Client } from "@libsql/client";

const globalForDb = globalThis as unknown as { dbClient?: Client };

function getDbClient(): Client {
  if (globalForDb.dbClient) return globalForDb.dbClient;

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:submissions.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

  const client = createClient({ url, authToken });
  globalForDb.dbClient = client;
  return client;
}

export const db = getDbClient();

export async function initSubmissionsTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export interface Submission {
  id: number;
  name: string;
  email: string;
  title: string;
  content: string;
  category: string | null;
  status: "pending" | "reviewing" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}
