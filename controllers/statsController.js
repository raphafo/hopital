import * as Stats from '../models/statsModel.js';

const ACTIONS = ['connexion', 'creation', 'modification', 'suppression'];

export async function dashboard(req, res, next) {
  try {
    const [kpi, consultations, specialites, statuts, medecins] = await Promise.all([
      Stats.kpi(),
      Stats.consultationsParMois(),
      Stats.parSpecialite(),
      Stats.parStatut(),
      Stats.parMedecin(),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({
      kpi,
      consultations_par_mois: consultations,
      par_specialite: specialites,
      par_statut: statuts,
      par_medecin: medecins,
      genere_le: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function activites(req, res, next) {
  try {
    const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : null;
    if (action && !ACTIONS.includes(action)) {
      return res.status(400).json({ erreur: 'Action invalide.' });
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    res.set('Cache-Control', 'no-store');
    res.json({ activites: await Stats.activites({ action, q: q || null }) });
  } catch (err) {
    next(err);
  }
}