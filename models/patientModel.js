// Requêtes SQL sur les patients (liste avec filtres, fiche détaillée, suppression)

import { pool, query } from '../config/db.js';

// Liste des patients avec recherche, filtres et pagination.
// resultats = tous les patients qui correspondent, page = juste ceux de la page demandée.
// On renvoie aussi le total pour savoir combien de pages afficher.
// Le LEFT JOIN avec total permet d'avoir le total même quand la page est vide.
// Si limite est null, LIMIT prend tout (pas de pagination).
export async function lister({ q, sexe, groupe, assure, limite, offset }) {
  const { rows } = await query(`
    WITH resultats AS (
      SELECT p.id, p.nom, p.prenom, to_char(p.date_naissance, 'YYYY-MM-DD') AS date_naissance,
             EXTRACT(YEAR FROM age(p.date_naissance))::int AS age,
             p.sexe, p.telephone, p.email, p.adresse, p.groupe_sanguin, p.allergies, p.assure
        FROM patients p
       WHERE ($1::text IS NULL
              OR p.nom ILIKE '%' || $1 || '%' OR p.prenom ILIKE '%' || $1 || '%'
              OR (p.prenom || ' ' || p.nom) ILIKE '%' || $1 || '%'
              OR p.telephone ILIKE '%' || $1 || '%' OR p.email ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR p.sexe = $2)
         AND ($3::text IS NULL OR p.groupe_sanguin = $3)
         AND ($4::boolean IS NULL OR p.assure = $4)
    ),
    page AS (
      SELECT * FROM resultats
       ORDER BY nom, prenom
       LIMIT COALESCE($5::int, (SELECT COUNT(*)::int FROM resultats))
      OFFSET $6
    )
    SELECT page.*, total.total_count
      FROM (SELECT COUNT(*)::int AS total_count FROM resultats) total
      LEFT JOIN page ON TRUE
     ORDER BY page.nom, page.prenom
  `, [echapperRecherche(q), sexe, groupe, assure, limite, offset]);
  const total = rows[0]?.total_count ?? 0;
  // on enlève la ligne vide (page vide) et la colonne total_count de chaque patient
  return {
    items: rows.filter((row) => row.id != null).map(({ total_count, ...patient }) => patient),
    total,
  };
}

// échappe % et _ pour qu'une recherche comme "50%" cherche vraiment le caractère %
const echapperRecherche = (q) => q?.replace(/[\\%_]/g, '\\$&') ?? null;

// Fiche d'un patient : ses infos, son âge, son nombre de dossiers et ses 5 derniers rendez-vous
export async function trouver(id) {
  const { rows } = await query(`
    SELECT p.id, p.nom, p.prenom, to_char(p.date_naissance, 'YYYY-MM-DD') AS date_naissance,
           EXTRACT(YEAR FROM age(p.date_naissance))::int AS age,
           p.sexe, p.telephone, p.email, p.adresse, p.groupe_sanguin, p.allergies, p.assure,
           (SELECT COUNT(*) FROM dossiers d WHERE d.patient_id = p.id)::int AS nb_dossiers
      FROM patients p WHERE p.id = $1
  `, [id]);
  if (!rows[0]) return null;

  const rdv = await query(`
    SELECT r.id, to_char(r.date_rdv, 'YYYY-MM-DD') AS date_rdv, to_char(r.heure_rdv, 'HH24:MI') AS heure_rdv,
           r.motif, r.statut, m.prenom AS medecin_prenom, m.nom AS medecin_nom
      FROM rendez_vous r JOIN medecins m ON m.id = r.medecin_id
     WHERE r.patient_id = $1
     ORDER BY r.date_rdv DESC, r.heure_rdv DESC
     LIMIT 5
  `, [id]);
  return { ...rows[0], derniers_rdv: rdv.rows };
}

// Supprime un patient dans une transaction (BEGIN ... COMMIT).
// Avec protegerDossiers (cas de la secrétaire), on annule si le patient a un dossier médical.
// FOR UPDATE bloque la ligne pendant la vérification, pour qu'un dossier ne soit pas
// ajouté entre le contrôle et la suppression.
// Renvoie null si introuvable, { protege: true } si refusé, sinon le patient supprimé.
export async function supprimer(id, { protegerDossiers = false } = {}) {
  // pour une transaction il faut garder la même connexion du début à la fin
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const patient = await client.query(
      'SELECT id FROM patients WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!patient.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    if (protegerDossiers) {
      const dossiers = await client.query(
        'SELECT EXISTS (SELECT 1 FROM dossiers WHERE patient_id = $1) AS presents',
        [id]
      );
      if (dossiers.rows[0].presents) {
        await client.query('ROLLBACK');
        return { protege: true };
      }
    }

    const suppression = await client.query(
      'DELETE FROM patients WHERE id = $1 RETURNING id, prenom, nom',
      [id]
    );
    await client.query('COMMIT');
    return suppression.rows[0] || null;
  } catch (err) {
    // en cas d'erreur on annule tout
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      err.rollbackError = rollbackError;
    }
    throw err;
  } finally {
    // on rend la connexion au pool dans tous les cas
    client.release();
  }
}
