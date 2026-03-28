import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

const pool = new Pool({ connectionString: getDatabaseUrl() });

export { pool };
export const db = drizzle(pool, { schema });
