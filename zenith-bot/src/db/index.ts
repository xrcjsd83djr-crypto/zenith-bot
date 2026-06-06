import "dotenv/config";
  import { drizzle } from "drizzle-orm/node-postgres";
  import { Pool } from "pg";
  import * as schema from "./schema.js";

  if (!process.env.DATABASE_URL) {
    throw new Error("[Zenith] DATABASE_URL must be set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on("error", (err) => {
    console.error("[Zenith] Unexpected DB pool error:", err);
  });

  export const db = drizzle(pool, { schema });
  