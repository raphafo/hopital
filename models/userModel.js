import { query } from '../config/db.js';

const PUBLIC = 'id, nom, prenom, email, role, actif, created_at';

export async function trouverParEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

export async function trouverParId(id) {
  const { rows } = await query(`SELECT ${PUBLIC} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function creer({ nom, prenom, email, hash, role = 'secretaire' }) {
  const { rows } = await query(
    `INSERT INTO users (nom, prenom, email, mot_de_passe_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${PUBLIC}`,
    [nom, prenom, email, hash, role]
  );
  return rows[0];
}

export async function lister() {
  const { rows } = await query(`SELECT ${PUBLIC} FROM users ORDER BY created_at DESC, id DESC`);
  return rows;
}

export async function modifier(id, { role, actif }) {
  const { rows } = await query(
    `UPDATE users
        SET role  = COALESCE($2::varchar, role),
            actif = COALESCE($3::boolean, actif)
      WHERE id = $1
      RETURNING ${PUBLIC}`,
    [id, role ?? null, actif ?? null]
  );
  return rows[0] || null;
}
