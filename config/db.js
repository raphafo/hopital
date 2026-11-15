import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const url = process.env.DATABASE_URL;

if (!url) {
  console.warn('[db] DATABASE_URL manquante : définissez-la dans .env ou dans les variables Vercel.');
}

const isLocal = /localhost|127\.0\.0\.1/.test(url || '');

// En serverless, chaque instance ouvre ses propres connexions : on garde le pool très petit
// et on le réutilise entre les appels grâce à globalThis.
export const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });

globalThis.__pgPool = pool;

export const query = (text, params) => pool.query(text, params);
