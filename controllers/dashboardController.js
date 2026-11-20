// Première version du tableau de bord (route /api/dashboard).
// Elle n'est plus appelée par les pages : dashboard.js utilise statsController.js à la place.

import { query } from '../config/db.js';

export async function getDashboard(req, res, next) {
  try {
    // les 5 requêtes partent en même temps
    const [statistiques, consultations, specialites, activites, statuts] = await Promise.all([
      // les 4 chiffres clés
      query(`
        SELECT
          (SELECT COUNT(*) FROM patients)::int AS patients,
          (SELECT COUNT(*) FROM medecins)::int AS medecins,
          (SELECT COUNT(*) FROM rendez_vous
            WHERE statut = 'planifie' AND date_rdv >= CURRENT_DATE)::int AS rendez_vous_a_venir,
          COALESCE(
            (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE statut = 'annule') / NULLIF(COUNT(*), 0))
             FROM rendez_vous),
            0
          )::int AS taux_annulation
      `),
      // consultations terminées sur les 6 derniers mois (generate_series crée les mois vides aussi)
      query(`
        WITH mois AS (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
            date_trunc('month', CURRENT_DATE),
            INTERVAL '1 month'
          )::date AS mois
        )
        SELECT mois.mois, COUNT(r.id)::int AS nombre
        FROM mois
        LEFT JOIN rendez_vous r
          ON date_trunc('month', r.date_rdv)::date = mois.mois
         AND r.statut = 'termine'
        GROUP BY mois.mois
        ORDER BY mois.mois
      `),
      // rendez-vous non annulés par spécialité
      query(`
        SELECT m.specialite, COUNT(r.id)::int AS nombre
        FROM medecins m
        LEFT JOIN rendez_vous r
          ON r.medecin_id = m.id AND r.statut <> 'annule'
        GROUP BY m.specialite
        ORDER BY nombre DESC, m.specialite
      `),
      // les 10 dernières activités
      query(`
        SELECT action, description, created_at
        FROM activites
        ORDER BY created_at DESC, id DESC
        LIMIT 10
      `),
      // nombre de rendez-vous par statut
      query(`
        SELECT statut, COUNT(*)::int AS nombre
        FROM rendez_vous
        GROUP BY statut
      `),
    ]);

    res.json({
      statistiques: statistiques.rows[0],
      consultationsParMois: consultations.rows,
      rendezVousParSpecialite: specialites.rows,
      activites: activites.rows,
      rendezVousParStatut: statuts.rows,
    });
  } catch (err) {
    next(err);
  }
}
