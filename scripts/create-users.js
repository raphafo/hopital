// Crée trois comptes de test (un par rôle). Usage : npm run db:users
// Changez ces mots de passe avant la soutenance si le site est public.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const comptes = [
  { nom: 'Admin',     prenom: 'Super',  email: 'admin@hopital.mu',            role: 'admin',      mdp: 'Admin123!' },
  { nom: 'Ramgoolam', prenom: 'Anil',   email: 'anil.ramgoolam@hopital.mu',   role: 'medecin',    mdp: 'Medecin123!' },
  { nom: 'Secretaire', prenom: 'Accueil', email: 'secretaire@hopital.mu',     role: 'secretaire', mdp: 'Secret123!' },
];

try {
  for (const c of comptes) {
    const hash = await bcrypt.hash(c.mdp, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (nom, prenom, email, mot_de_passe_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash, role = EXCLUDED.role
       RETURNING id`,
      [c.nom, c.prenom, c.email, hash, c.role]
    );
    if (c.role === 'medecin') {
      await pool.query('UPDATE medecins SET user_id = $1 WHERE email = $2', [rows[0].id, c.email]);
    }
    console.log(`✔ ${c.role.padEnd(10)} ${c.email}  /  ${c.mdp}`);
  }
} catch (err) {
  console.error('✖ Erreur :', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
