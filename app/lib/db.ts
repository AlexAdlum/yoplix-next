// app/lib/db.ts
import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  
  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error('DATABASE_URL is not set');
  }

  _pool = new Pool({ connectionString: connStr, max: 3 });
  _db = drizzle(_pool);
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    if (!_pool) {
      const connStr = process.env.DATABASE_URL;
      if (!connStr) {
        throw new Error('DATABASE_URL is not set');
      }
      _pool = new Pool({ connectionString: connStr, max: 3 });
    }
    return _pool[prop as keyof Pool];
  },
});
