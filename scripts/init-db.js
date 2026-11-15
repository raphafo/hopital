// Crée les tables et insère les données de test.
// Usage : npm run db:init   (ATTENTION : supprime et recrée toutes les tables)
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sql');

try {
  for (const fichier of ['schema.sql', 'seed.sql']) {
    const sql = fs.readFileSync(path.join(dir, fichier), 'utf8');
    await pool.query(sql);
    console.log(`✔ ${fichier} exécuté`);
  }
} catch (err) {
  console.error('✖ Erreur :', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
