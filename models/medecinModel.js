// Requêtes SQL sur les médecins

import { query } from '../config/db.js';

// Liste des médecins avec recherche, filtres et pagination (même principe que patientModel).
// rdv_a_venir = nombre de rendez-vous planifiés à partir d'aujourd'hui, affiché sur les cartes.
export async function lister({ q, specialite, disponible, limite, offset }) {
  const { rows } = await query(`
    WITH resultats AS (
      SELECT m.id, m.nom, m.prenom, m.specialite, m.telephone, m.email, m.disponible, m.photo_url,
             (SELECT COUNT(*) FROM rendez_vous r
               WHERE r.medecin_id = m.id AND r.statut = 'planifie' AND r.date_rdv >= CURRENT_DATE)::int AS rdv_a_venir
        FROM medecins m
       WHERE ($1::text IS NULL
              OR m.nom ILIKE '%' || $1 || '%' OR m.prenom ILIKE '%' || $1 || '%'
              OR (m.prenom || ' ' || m.nom) ILIKE '%' || $1 || '%'
              OR m.specialite ILIKE '%' || $1 || '%' OR m.email ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR m.specialite = $2)
         AND ($3::boolean IS NULL OR m.disponible = $3)
    ),
    page AS (
      SELECT * FROM resultats
       ORDER BY nom, prenom
       LIMIT COALESCE($4::int, (SELECT COUNT(*)::int FROM resultats))
      OFFSET $5
    )
    SELECT page.*, total.total_count
      FROM (SELECT COUNT(*)::int AS total_count FROM resultats) total
      LEFT JOIN page ON TRUE
     ORDER BY page.nom, page.prenom
  `, [echapperRecherche(q), specialite, disponible, limite, offset]);
  const total = rows[0]?.total_count ?? 0;
  return {
    items: rows.filter((row) => row.id != null).map(({ total_count, ...medecin }) => medecin),
    total,
  };
}

// échappe % et _ dans la recherche
const echapperRecherche = (q) => q?.replace(/[\\%_]/g, '\\$&') ?? null;

// Fiche d'un médecin : infos, compteurs par statut et ses 5 prochains rendez-vous
export async function trouver(id) {
  const { rows } = await query(`
    SELECT m.id, m.nom, m.prenom, m.specialite, m.telephone, m.email, m.disponible, m.photo_url,
           COUNT(r.id) FILTER (WHERE r.statut = 'planifie')::int AS planifies,
           COUNT(r.id) FILTER (WHERE r.statut = 'termine')::int  AS termines,
           COUNT(r.id) FILTER (WHERE r.statut = 'annule')::int   AS annules
      FROM medecins m
      LEFT JOIN rendez_vous r ON r.medecin_id = m.id
     WHERE m.id = $1
     GROUP BY m.id
  `, [id]);
  if (!rows[0]) return null;

  const prochains = await query(`
    SELECT r.id, to_char(r.date_rdv, 'YYYY-MM-DD') AS date_rdv, to_char(r.heure_rdv, 'HH24:MI') AS heure_rdv,
           r.motif, p.prenom AS patient_prenom, p.nom AS patient_nom
      FROM rendez_vous r JOIN patients p ON p.id = r.patient_id
     WHERE r.medecin_id = $1 AND r.statut = 'planifie' AND r.date_rdv >= CURRENT_DATE
     ORDER BY r.date_rdv, r.heure_rdv
     LIMIT 5
  `, [id]);
  return { ...rows[0], prochains_rdv: prochains.rows };
}

// valeurs pour remplir les listes déroulantes de filtres (spécialités et médecins)
export async function filtres() {
  const specialites = await query('SELECT DISTINCT specialite FROM medecins ORDER BY specialite');
  const medecins = await query('SELECT id, prenom, nom FROM medecins ORDER BY nom, prenom');
  return { specialites: specialites.rows.map((r) => r.specialite), medecins: medecins.rows };
}

// la base refuse si le médecin a encore des rendez-vous (erreur gérée dans le contrôleur)
export async function supprimer(id) {
  const { rows } = await query('DELETE FROM medecins WHERE id = $1 RETURNING id, prenom, nom', [id]);
  return rows[0] || null;
}

// Utilisé pour limiter un médecin connecté à ses propres rendez-vous
// (fait le lien compte utilisateur -> fiche médecin)
export async function idParUtilisateur(userId) {
  const { rows } = await query('SELECT id FROM medecins WHERE user_id = $1', [userId]);
  return rows[0]?.id ?? null;
}