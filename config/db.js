// Connexion à PostgreSQL. Tous les modèles utilisent la fonction query() d'ici.

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
// adresse de la base (fichier .env en local, variables Vercel en ligne)
const url = process.env.DATABASE_URL;

if (!url) {
  console.warn('[db] DATABASE_URL manquante : définissez-la dans .env ou dans les variables Vercel.');
}

// base locale = pas de SSL, base en ligne = SSL
const isLocal = /localhost|127\.0\.0\.1/.test(url || '');

// En serverless, chaque instance ouvre ses propres connexions : on garde le pool très petit
// et on le réutilise entre les appels grâce à globalThis.
// (le pool garde quelques connexions ouvertes pour ne pas se reconnecter à chaque requête)
export const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 2,                         // 2 connexions max
    idleTimeoutMillis: 10_000,      // on ferme une connexion inutilisée après 10 s
    connectionTimeoutMillis: 8_000, // on abandonne si la base ne répond pas en 8 s
  });

globalThis.__pgPool = pool;

// Lance une requête SQL. Les valeurs vont dans params ($1, $2...) et pas dans le texte,
// comme ça pas d'injection SQL possible.
export const query = (text, params) => pool.query(text, params);
