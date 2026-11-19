// Requêtes SQL sur la table users (comptes de connexion)

import { query } from '../config/db.js';

// colonnes qu'on peut renvoyer sans risque (pas le hash du mot de passe)
const PUBLIC = 'id, nom, prenom, email, role, actif, created_at';

// renvoie tout le compte, hash compris : sert uniquement à vérifier le mot de passe à la connexion
export async function trouverParEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

export async function trouverParId(id) {
  const { rows } = await query(`SELECT ${PUBLIC} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

// crée un compte, rôle secrétaire par défaut. RETURNING renvoie la ligne créée.
export async function creer({ nom, prenom, email, hash, role = 'secretaire' }) {
  const { rows } = await query(
    `INSERT INTO users (nom, prenom, email, mot_de_passe_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${PUBLIC}`,
    [nom, prenom, email, hash, role]
  );
  return rows[0];
}

// tous les comptes, les plus récents en premier
export async function lister() {
  const { rows } = await query(`SELECT ${PUBLIC} FROM users ORDER BY created_at DESC, id DESC`);
  return rows;
}

// change le rôle et/ou l'état actif.
// COALESCE garde l'ancienne valeur quand on envoie null (champ non modifié)
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
