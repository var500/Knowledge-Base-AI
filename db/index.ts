import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.ts";

/**
 * Singleton Drizzle client connected to Supabase via the postgres driver.
 *
 * In Next.js (serverless), connections are short-lived per request.
 * The `max: 1` ensures we don't open more connections than the
 * Supabase session pooler can handle in a serverless environment.
 */
const client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

export const db = drizzle(client, { schema });
