import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

// Tagged-template client — use for all fixed queries
export const sql = neon(process.env.DATABASE_URL!)

// Dynamic parameterised query helper.
// @neondatabase/serverless supports calling sql() as a regular function
// with a query string + params array (not just tagged template literals).
export async function query<T = any>(queryStr: string, params: any[] = []): Promise<T[]> {
  const result = await (sql as any)(queryStr, params)
  return result as T[]
}