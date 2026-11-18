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
    if (req.query.action != null && typeof req.query.action !== 'string') {
      return res.status(400).json({ erreur: 'Action invalide.' });
    }
    if (req.query.q != null && typeof req.query.q !== 'string') {
      return res.status(400).json({ erreur: 'Recherche invalide.' });
    }
    const action = req.query.action || null;
    if (action && !ACTIONS.includes(action)) {
      return res.status(400).json({ erreur: 'Action invalide.' });
    }
    const q = req.query.q?.trim() || '';
    if (q.length > 100) return res.status(400).json({ erreur: 'Recherche trop longue.' });
    res.set('Cache-Control', 'no-store');
    res.json({ activites: await Stats.activites({ action, q: q || null }) });
  } catch (err) {
    next(err);
  }
}