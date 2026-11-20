// Routes spécifiques aux médecins : liste, valeurs des filtres, détail, suppression.
// L'ajout et la modification passent par clinicalController.js

import * as Medecins from '../models/medecinModel.js';
import { enregistrerActivite } from '../models/activiteModel.js';
import { lirePagination, lireRecherche, lireFiltres, reponsePage, idValide } from '../utils/filtres.js';

// GET /api/medecins?q=...&specialite=...&disponible=...&page=...
export async function lister(req, res, next) {
  try {
    const { filtres, erreur } = lireFiltres(req.query, { specialite: { texte: true }, disponible: { booleen: true } });
    if (erreur) return res.status(400).json({ erreur: `Paramètre invalide : ${erreur}` });

    // sans page/limite on renvoie toute la liste
    const paginationActive = req.query.page != null || req.query.limite != null;
    const pagination = lirePagination(req.query, { limiteParDefaut: 9 });
    const { items, total } = await Medecins.lister({
      q: lireRecherche(req.query),
      specialite: filtres.specialite,
      disponible: filtres.disponible,
      limite: paginationActive ? pagination.limite : null,
      offset: pagination.offset,
    });
    res.set('Cache-Control', 'no-store');
    res.json(paginationActive ? reponsePage(items, pagination, total) : { medecins: items });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ erreur: err.message });
    next(err);
  }
}

// GET /api/medecins/filtres : spécialités et médecins pour remplir les listes de filtres de gestion.html
export async function listeFiltres(req, res, next) {
  try {
    res.json(await Medecins.filtres());
  } catch (err) {
    next(err);
  }
}

// GET /api/medecins/:id : fiche d'un médecin
export async function detail(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });
    res.set('Cache-Control', 'no-store');
    const medecin = await Medecins.trouver(id);
    if (!medecin) return res.status(404).json({ erreur: 'Médecin introuvable' });
    res.json({ medecin });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/medecins/:id
export async function supprimer(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });

    const medecin = await Medecins.supprimer(id);
    if (!medecin) return res.status(404).json({ erreur: 'Médecin introuvable' });

    await enregistrerActivite({
      userId: req.user.id, action: 'suppression', entite: 'medecin', entiteId: id,
      description: `Médecin supprimé : Dr ${medecin.prenom} ${medecin.nom}`,
    });
    res.json({ message: 'Médecin supprimé' });
  } catch (err) {
    // 23503 = clé étrangère : la base refuse car le médecin a encore des rendez-vous (ON DELETE RESTRICT)
    if (err.code === '23503') {
      return res.status(409).json({ erreur: 'Ce médecin a des rendez-vous : suppression impossible.' });
    }
    next(err);
  }
}
