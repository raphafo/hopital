import * as Patients from '../models/patientModel.js';
import { enregistrerActivite } from '../models/activiteModel.js';
import { lirePagination, lireRecherche, lireFiltres, reponsePage, idValide } from '../utils/filtres.js';

const GROUPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export async function lister(req, res, next) {
  try {
    const { filtres, erreur } = lireFiltres(req.query, {
      sexe: { enumeration: ['M', 'F'] },
      groupe: { enumeration: GROUPES },
      assure: { booleen: true },
    });
    if (erreur) return res.status(400).json({ erreur: `Paramètre invalide : ${erreur}` });

    const paginationActive = req.query.page != null || req.query.limite != null;
    const pagination = lirePagination(req.query, { limiteParDefaut: 9 });
    const { items, total } = await Patients.lister({
      q: lireRecherche(req.query),
      sexe: filtres.sexe,
      groupe: filtres.groupe,
      assure: filtres.assure,
      limite: paginationActive ? pagination.limite : null,
      offset: pagination.offset,
    });
    res.set('Cache-Control', 'no-store');
    res.json(paginationActive ? reponsePage(items, pagination, total) : { patients: items });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ erreur: err.message });
    next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });
    res.set('Cache-Control', 'no-store');
    const patient = await Patients.trouver(id);
    if (!patient) return res.status(404).json({ erreur: 'Patient introuvable' });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
}

export async function supprimer(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });

    const patient = await Patients.supprimer(id, { protegerDossiers: req.user.role === 'secretaire' });
    if (!patient) return res.status(404).json({ erreur: 'Patient introuvable' });
    if (patient.protege) {
      return res.status(409).json({ erreur: 'Une secrétaire ne peut pas supprimer un patient ayant un dossier médical.' });
    }

    await enregistrerActivite({
      userId: req.user.id, action: 'suppression', entite: 'patient', entiteId: id,
      description: `Patient supprimé : ${patient.prenom} ${patient.nom}`,
    });
    res.json({ message: 'Patient supprimé' });
  } catch (err) {
    next(err);
  }
}