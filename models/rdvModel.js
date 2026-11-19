// Requêtes SQL sur les rendez-vous

import { query } from '../config/db.js';

// colonnes communes : le rdv + le nom du patient et du médecin (dates mises au format texte)
const COLONNES = `
  r.id, to_char(r.date_rdv, 'YYYY-MM-DD') AS date_rdv, to_char(r.heure_rdv, 'HH24:MI') AS heure_rdv,
  r.motif, r.statut,
  p.id AS patient_id, p.prenom AS patient_prenom, p.nom AS patient_nom,
  m.id AS medecin_id, m.prenom AS medecin_prenom, m.nom AS medecin_nom, m.specialite`;

// jointures pour récupérer le patient et le médecin de chaque rendez-vous
const JOINTURES = `
  FROM rendez_vous r
  JOIN patients p ON p.id = r.patient_id
  JOIN medecins m ON m.id = r.medecin_id`;

// Liste des rendez-vous avec recherche (patient, médecin, motif), filtres et pagination.
// Les plus récents en premier. Même principe resultats / page / total que patientModel.
export async function lister({ q, statut, medecinId, dateDebut, dateFin, limite, offset }) {
  const { rows } = await query(`
    WITH resultats AS (
      SELECT ${COLONNES}
      ${JOINTURES}
       WHERE ($1::text IS NULL
              OR p.nom ILIKE '%' || $1 || '%' OR p.prenom ILIKE '%' || $1 || '%'
              OR (p.prenom || ' ' || p.nom) ILIKE '%' || $1 || '%'
              OR m.nom ILIKE '%' || $1 || '%' OR m.prenom ILIKE '%' || $1 || '%'
              OR r.motif ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR r.statut = $2)
         AND ($3::int IS NULL OR r.medecin_id = $3)
         AND ($4::date IS NULL OR r.date_rdv >= $4)
         AND ($5::date IS NULL OR r.date_rdv <= $5)
    ),
    page AS (
      SELECT * FROM resultats
       ORDER BY date_rdv DESC, heure_rdv DESC, id DESC
       LIMIT COALESCE($6::int, (SELECT COUNT(*)::int FROM resultats))
      OFFSET $7
    )
    SELECT page.*, total.total_count
      FROM (SELECT COUNT(*)::int AS total_count FROM resultats) total
      LEFT JOIN page ON TRUE
     ORDER BY page.date_rdv DESC, page.heure_rdv DESC, page.id DESC
  `, [echapperRecherche(q), statut, medecinId, dateDebut, dateFin, limite, offset]);
  const total = rows[0]?.total_count ?? 0;
  return {
    items: rows.filter((row) => row.id != null).map(({ total_count, ...rdv }) => rdv),
    total,
  };
}

// échappe % et _ dans la recherche
const echapperRecherche = (q) => q?.replace(/[\\%_]/g, '\\$&') ?? null;

// un rendez-vous avec les noms du patient et du médecin
export async function trouver(id) {
  const { rows } = await query(`SELECT ${COLONNES} ${JOINTURES} WHERE r.id = $1`, [id]);
  return rows[0] || null;
}

// Ne modifie que les rendez-vous encore planifiés
// renvoie true si une ligne a été modifiée
export async function changerStatut(id, statut) {
  const { rowCount } = await query(
    `UPDATE rendez_vous SET statut = $2 WHERE id = $1 AND statut = 'planifie'`, [id, statut]
  );
  return rowCount > 0;
}

// renvoie true si le rendez-vous a bien été supprimé
export async function supprimer(id) {
  const { rowCount } = await query('DELETE FROM rendez_vous WHERE id = $1', [id]);
  return rowCount > 0;
}
