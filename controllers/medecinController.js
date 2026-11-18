import * as Medecins from '../models/medecinModel.js';
import { enregistrerActivite } from '../models/activiteModel.js';
import { lirePagination, lireRecherche, lireFiltres, reponsePage, idValide } from '../utils/filtres.js';

export async function lister(req, res, next) {
  try {
    const { filtres, erreur } = lireFiltres(req.query, { specialite: { texte: true }, disponible: { booleen: true } });
    if (erreur) return res.status(400).json({ erreur: `Paramètre invalide : ${erreur}` });

    const pagination = lirePagination(req.query, { limiteParDefaut: 9 });
    const lignes = await Medecins.lister({
      q: lireRecherche(req.query),
      specialite: filtres.specialite,
      disponible: filtres.disponible,
      limite: pagination.limite,
      offset: pagination.offset,
    });
    res.set('Cache-Control', 'no-store');
    res.json(reponsePage(lignes, pagination));
  } catch (err) {
    next(err);
  }
}

export async function listeFiltres(req, res, next) {
  try {
    res.json(await Medecins.filtres());
  } catch (err) {
    next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });
    const medecin = await Medecins.trouver(id);
    if (!medecin) return res.status(404).json({ erreur: 'Médecin introuvable' });
    res.json({ medecin });
  } catch (err) {
    next(err);
  }
}

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
    if (err.code === '23503') {
      return res.status(409).json({ erreur: 'Ce médecin a des rendez-vous : suppression impossible.' });
    }
    next(err);
  }
}