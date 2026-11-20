// Crée les tables et insère les données de test.
// Usage : npm run db:init   (ATTENTION : supprime et recrée toutes les tables)
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

// chemin du dossier sql/ (un niveau au-dessus de scripts/)
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sql');

// on exécute d'abord le schéma (tables) puis les données de test, dans cet ordre
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
  // ferme la connexion pour que le script se termine
  await pool.end();
}
