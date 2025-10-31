import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  userId: text('user_id').primaryKey(),
  email: text('email'),
  qtyOfVisits: integer('qty_of_visits').notNull().default(0),
  firstTimestamp: timestamp('first_timestamp', { withTimezone: true }),
  lastTimestamp: timestamp('last_timestamp', { withTimezone: true }),
});

