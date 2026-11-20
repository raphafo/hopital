// Requêtes SQL sur les dossiers médicaux.
// medecinId : quand il est donné, on ne voit que les dossiers de ce médecin.

import { query } from '../config/db.js';

// échappe % et _ dans la recherche
function echapperRecherche(q) {
  return q?.replace(/[\\%_]/g, '\\$&') ?? null;
}

// Liste des dossiers avec recherche (patient, médecin, diagnostic, traitement, notes) et pagination.
// On ne charge pas le PDF, juste fichier_present (vrai/faux) pour savoir s'il y en a un.
export async function lister({ q, medecinId, limite, offset }) {
  const { rows } = await query(`
    WITH resultats AS (
      SELECT d.id, d.patient_id, d.medecin_id, d.rendez_vous_id,
             d.diagnostic, d.traitement, d.notes, d.fichier_nom,
             d.fichier_data IS NOT NULL AS fichier_present,
             d.created_at, d.updated_at,
             p.prenom AS patient_prenom, p.nom AS patient_nom,
             m.prenom AS medecin_prenom, m.nom AS medecin_nom
        FROM dossiers d
        JOIN patients p ON p.id = d.patient_id
        LEFT JOIN medecins m ON m.id = d.medecin_id
       WHERE ($1::text IS NULL
              OR p.nom ILIKE '%' || $1 || '%' OR p.prenom ILIKE '%' || $1 || '%'
              OR (p.prenom || ' ' || p.nom) ILIKE '%' || $1 || '%'
              OR COALESCE(m.nom, '') ILIKE '%' || $1 || '%'
              OR COALESCE(m.prenom, '') ILIKE '%' || $1 || '%'
              OR d.diagnostic ILIKE '%' || $1 || '%'
              OR COALESCE(d.traitement, '') ILIKE '%' || $1 || '%'
              OR COALESCE(d.notes, '') ILIKE '%' || $1 || '%')
         AND ($2::int IS NULL OR d.medecin_id = $2)
    ),
    page AS (
      SELECT * FROM resultats
       ORDER BY updated_at DESC, id DESC
       LIMIT COALESCE($3::int, (SELECT COUNT(*)::int FROM resultats))
      OFFSET $4
    )
    SELECT page.*, total.total_count
      FROM (SELECT COUNT(*)::int AS total_count FROM resultats) total
      LEFT JOIN page ON TRUE
     ORDER BY page.updated_at DESC, page.id DESC
  `, [echapperRecherche(q), medecinId, limite, offset]);

  const total = rows[0]?.total_count ?? 0;
  return {
    items: rows.filter((row) => row.id != null).map(({ total_count, ...dossier }) => dossier),
    total,
  };
}

// un dossier (sans le contenu du PDF)
export async function trouver(id, medecinId = null) {
  const { rows } = await query(`
    SELECT d.id, d.patient_id, d.medecin_id, d.rendez_vous_id,
           d.diagnostic, d.traitement, d.notes, d.fichier_nom,
           d.fichier_type, d.fichier_data IS NOT NULL AS fichier_present,
           d.created_at, d.updated_at,
           p.prenom AS patient_prenom, p.nom AS patient_nom,
           m.prenom AS medecin_prenom, m.nom AS medecin_nom
      FROM dossiers d
      JOIN patients p ON p.id = d.patient_id
      LEFT JOIN medecins m ON m.id = d.medecin_id
     WHERE d.id = $1 AND ($2::int IS NULL OR d.medecin_id = $2)
  `, [id, medecinId]);
  return rows[0] || null;
}

// le PDF d'un dossier (nom, type et contenu), pour le téléchargement
export async function fichier(id, medecinId = null) {
  const { rows } = await query(`
    SELECT fichier_nom, fichier_type, fichier_data
      FROM dossiers
     WHERE id = $1 AND ($2::int IS NULL OR medecin_id = $2)
  `, [id, medecinId]);
  return rows[0] || null;
}
