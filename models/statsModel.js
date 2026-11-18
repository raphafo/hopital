import { query } from '../config/db.js';

export async function kpi() {
  const { rows } = await query(`
    SELECT
      (SELECT COUNT(*) FROM patients)::int AS patients,
      (SELECT COUNT(*) FROM medecins)::int AS medecins,
      (SELECT COUNT(*) FROM rendez_vous WHERE statut = 'planifie' AND date_rdv >= CURRENT_DATE)::int AS rdv_a_venir,
      (SELECT COUNT(*) FROM rendez_vous WHERE date_rdv = CURRENT_DATE AND statut <> 'annule')::int AS rdv_aujourdhui,
      (SELECT COUNT(*) FROM rendez_vous)::int AS rdv_total,
      COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE statut = 'annule') / NULLIF(COUNT(*), 0), 1)
                  FROM rendez_vous), 0)::float AS taux_annulation
  `);
  return rows[0];
}

// Consultations terminées sur les 6 derniers mois, mois sans consultation inclus (valeur 0)
export async function consultationsParMois() {
  const { rows } = await query(`
    SELECT to_char(m, 'YYYY-MM') AS mois, COALESCE(c.nb, 0)::int AS nb
      FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months',
                           date_trunc('month', CURRENT_DATE), interval '1 month') AS m
      LEFT JOIN (SELECT date_trunc('month', date_rdv) AS mois, COUNT(*) AS nb
                   FROM rendez_vous WHERE statut = 'termine' GROUP BY 1) c ON c.mois = m
     ORDER BY m
  `);
  return rows;
}

export async function parSpecialite() {
  const { rows } = await query(`
    SELECT m.specialite, COUNT(r.id)::int AS nb
      FROM medecins m
      LEFT JOIN rendez_vous r ON r.medecin_id = m.id AND r.statut <> 'annule'
     GROUP BY m.specialite
     ORDER BY nb DESC, m.specialite
  `);
  return rows;
}

export async function parStatut() {
  const { rows } = await query(`
    SELECT s.statut, COALESCE(c.nb, 0)::int AS nb
      FROM (VALUES ('planifie'), ('termine'), ('annule')) AS s(statut)
      LEFT JOIN (SELECT statut, COUNT(*) AS nb FROM rendez_vous GROUP BY statut) c USING (statut)
  `);
  return rows;
}

export async function parMedecin() {
  const { rows } = await query(`
    SELECT m.id, m.prenom, m.nom, m.specialite,
           COUNT(r.id)::int AS total,
           COUNT(*) FILTER (WHERE r.statut = 'planifie')::int AS planifies,
           COUNT(*) FILTER (WHERE r.statut = 'termine')::int  AS termines,
           COUNT(*) FILTER (WHERE r.statut = 'annule')::int   AS annules
      FROM medecins m
      LEFT JOIN rendez_vous r ON r.medecin_id = m.id
     GROUP BY m.id
     ORDER BY total DESC, m.nom
  `);
  return rows;
}

export async function activites({ action = null, q = null, limite = 20 }) {
  const motif = q ? q.replace(/[\\%_]/g, '\\$&') : null;
  const { rows } = await query(`
    SELECT a.id, a.action, a.entite, a.description, a.created_at,
           u.prenom AS user_prenom, u.nom AS user_nom
      FROM activites a
      LEFT JOIN users u ON u.id = a.user_id
     WHERE ($1::text IS NULL OR a.action = $1)
       AND ($2::text IS NULL OR a.description ILIKE '%' || $2 || '%')
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT $3
  `, [action, motif, limite]);
  return rows;
}