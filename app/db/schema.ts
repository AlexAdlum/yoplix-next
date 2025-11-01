import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  userId: text('user_id').primaryKey(),
  email: text('email'),
  qtyOfVisits: integer('qty_of_visits').notNull().default(0),
  firstTimestamp: timestamp('first_timestamp', { withTimezone: true }),
  lastTimestamp: timestamp('last_timestamp', { withTimezone: true }),
});

export const visits = pgTable('visits', {
  userId: text('user_id').notNull(),
  slug: text('slug').notNull(),
  path: text('path').notNull(),
  referrer: text('referrer').default(''),
  ua: text('ua').default(''),          // user-agent (soft FP)
  ch: text('client_hints').default(''), // UA-CH JSON string
  ipHash: text('ip_hash').notNull(),    // sha256(ip|ua)
  visitedAt: timestamp('visited_at', { withTimezone: true }).defaultNow().notNull(),
});


