import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// Supabase Connection Pooling works best when prefetch is disabled
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
