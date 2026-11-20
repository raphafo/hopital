// Routes des patients, médecins, rendez-vous et dossiers.
// Les 4 ont les mêmes routes CRUD, donc routeRessource() les crée toutes
// en précisant qui a le droit de lire et qui a le droit d'écrire.

import { Router } from 'express';
import { creerHandlers } from '../controllers/clinicalController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';
import * as Patients from '../controllers/patientController.js';
import * as Medecins from '../controllers/medecinController.js';
import * as Rdv from '../controllers/rdvController.js';
import * as Dossiers from '../controllers/dossierController.js';

const router = Router();
const TOUS_LES_ROLES = ['admin', 'medecin', 'secretaire'];

// Crée les routes d'une ressource :
// GET / (liste), GET /filtres, GET /:id/fichier, GET /:id (détail),
// POST / (ajout), PUT /:id (modif), PATCH /:id/statut, DELETE /:id
// Chaque route vérifie qu'on est connecté puis que le rôle est autorisé.
// Dans options on peut remplacer un handler générique par un handler spécial.
function routeRessource(type, rolesLecture, rolesEcriture, options = {}) {
  const sousRoute = Router();
  const handlers = creerHandlers(type);
  // vérification en plus avant d'écrire (ex : un médecin ne touche qu'à ses dossiers)
  const avantEcriture = options.avantEcriture ? [options.avantEcriture] : [];
  if (options.filtres) {
    sousRoute.get('/filtres', exigerConnexion, exigerRoleEnBase(...rolesLecture), options.filtres);
  }
  sousRoute.get('/', exigerConnexion, exigerRoleEnBase(...rolesLecture), options.lister || handlers.lister);
  if (options.fichier) {
    sousRoute.get('/:id/fichier', exigerConnexion, exigerRoleEnBase(...rolesLecture), options.fichier);
  }
  if (options.detail) {
    sousRoute.get('/:id', exigerConnexion, exigerRoleEnBase(...rolesLecture), options.detail);
  }
  sousRoute.post('/', exigerConnexion, exigerRoleEnBase(...rolesEcriture), ...avantEcriture, handlers.creer);
  sousRoute.put('/:id', exigerConnexion, exigerRoleEnBase(...rolesEcriture), ...avantEcriture, handlers.modifier);
  if (options.changerStatut) {
    sousRoute.patch('/:id/statut', exigerConnexion, exigerRoleEnBase(...(options.rolesStatut || rolesEcriture)), options.changerStatut);
  }
  sousRoute.delete('/:id', exigerConnexion, exigerRoleEnBase(...rolesEcriture), ...avantEcriture, options.supprimer || handlers.supprimer);
  return sousRoute;
}

// patients : tout le monde lit, admin et secrétaire modifient
router.use('/patients', routeRessource('patients', TOUS_LES_ROLES, ['admin', 'secretaire'], {
  lister: Patients.lister,
  detail: Patients.detail,
  supprimer: Patients.supprimer,
}));
// médecins : tout le monde lit, seul l'admin modifie
router.use('/medecins', routeRessource('medecins', TOUS_LES_ROLES, ['admin'], {
  lister: Medecins.lister,
  filtres: Medecins.listeFiltres,
  detail: Medecins.detail,
  supprimer: Medecins.supprimer,
}));
// rendez-vous : admin et secrétaire modifient, mais tout le monde peut changer le statut
// (le médecin seulement sur ses rdv, c'est vérifié dans rdvController)
router.use('/rdv', routeRessource('rdv', TOUS_LES_ROLES, ['admin', 'secretaire'], {
  lister: Rdv.lister,
  changerStatut: Rdv.changerStatut,
  supprimer: Rdv.supprimer,
  rolesStatut: TOUS_LES_ROLES,
}));
// dossiers médicaux : admin et médecin seulement, la secrétaire n'y a pas accès
router.use('/dossiers', routeRessource('dossiers', ['admin', 'medecin'], ['admin', 'medecin'], {
  lister: Dossiers.lister,
  detail: Dossiers.detail,
  fichier: Dossiers.fichier,
  avantEcriture: Dossiers.verifierModificationMedecin,
}));

export default router;
