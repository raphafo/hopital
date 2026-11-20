// Données du tableau de bord (routes /api/stats). Les requêtes SQL sont dans models/statsModel.js

import * as Stats from '../models/statsModel.js';

// types d'actions qu'on peut filtrer dans l'historique
const ACTIONS = ['connexion', 'creation', 'modification', 'suppression'];

// GET /api/stats/dashboard
// lance toutes les requêtes en même temps (Promise.all) et renvoie tout d'un coup
export async function dashboard(req, res, next) {
  try {
    const [kpi, consultations, specialites, statuts, medecins] = await Promise.all([
      Stats.kpi(),
      Stats.consultationsParMois(),
      Stats.parSpecialite(),
      Stats.parStatut(),
      Stats.parMedecin(),
    ]);
    // no-store : le navigateur ne garde pas en cache, sinon l'actualisation auto afficherait de vieux chiffres
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

// GET /api/stats/activites?action=...&q=...
// historique filtré par type d'action et/ou par texte recherché
export async function activites(req, res, next) {
  try {
    // si on envoie ?action=a&action=b, Express donne un tableau : on refuse
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
