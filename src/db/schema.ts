import { pgTable, serial, text, bigint } from 'drizzle-orm/pg-core';

export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});
