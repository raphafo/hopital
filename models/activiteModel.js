import { query } from '../config/db.js';

// L'historique ne doit jamais faire échouer une action : en cas d'erreur, on journalise seulement.
export async function enregistrerActivite({ userId = null, action, entite, entiteId = null, description }) {
  try {
    await query(
      `INSERT INTO activites (user_id, action, entite, entite_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entite, entiteId, description]
    );
  } catch (err) {
    console.error('[activite]', err.message);
  }
}
