// drizzle.config.ts
import 'dotenv/config'; // <-- важно: подхватывает .env/.env.local
import type { Config } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export default {
  schema: './app/db/schema.ts',       // путь к схеме Drizzle
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
