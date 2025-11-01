import { pgTable, text, integer, timestamp, numeric, jsonb, primaryKey } from 'drizzle-orm/pg-core';

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

export const devices = pgTable('devices', {
  userId: text('user_id').notNull(),              // связь с users.user_id (логическая)
  fingerprintHash: text('fingerprint_hash').notNull(), // sha256 из (ip|ua) или другой мягкий отпечаток
  userAgent: text('ua'),
  clientHints: jsonb('client_hints'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.fingerprintHash] }),
}));

export const sessions = pgTable('sessions', {
  roomId: text('room_id').primaryKey(),         // id комнаты (из текущей логики)
  hostUserId: text('host_user_id').notNull(),   // кто создал
  slug: text('slug').notNull(),                 // викторина
  playersQty: integer('players_qty').default(0).notNull(),
  amountPaid: integer('amount_paid'),           // на будущее
  startAt: timestamp('start_at', { withTimezone: true }),
  finishAt: timestamp('finish_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const players = pgTable('players', {
  roomId: text('room_id').notNull(),
  userId: text('user_id').notNull(),
  slug: text('slug').notNull(),
  trueAnswRatio: numeric('true_answ_ratio'),   // 0..1
  avgAnswTimeMs: integer('avg_answ_time_ms'),
  score: integer('score'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roomId, t.userId] }),
}));


