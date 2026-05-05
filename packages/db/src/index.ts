import { drizzle } from "drizzle-orm/d1";
import type { AnyD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export type D1DatabaseBinding = AnyD1Database;

export function createDb(database: D1DatabaseBinding) {
  return drizzle(database, { schema });
}
