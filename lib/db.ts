import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  // In a real app, you might want to throw an error or handle this differently.
  // For v0 preview, we'll log and proceed, but queries will fail.
  console.error("DATABASE_URL environment variable is not set. Database queries will fail.")
}

// Ensure that neon is only called if databaseUrl is set.
// The sql export will be undefined if DATABASE_URL is not set,
// and attempts to use it will result in a runtime error.
export const sql = databaseUrl ? neon(databaseUrl) : undefined

// Helper function to ensure sql is defined before use
export function getDbClient() {
  if (!sql) {
    throw new Error("Database client is not initialized. Check DATABASE_URL.")
  }
  return sql
}
