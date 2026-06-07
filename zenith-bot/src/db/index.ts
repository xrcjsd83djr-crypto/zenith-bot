import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema.js";

const url   = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || "";

if (!url) {
  throw new Error("[Zenith] TURSO_DATABASE_URL must be set");
}

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
