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

function routeRessource(type, rolesLecture, rolesEcriture, options = {}) {
  const sousRoute = Router();
  const handlers = creerHandlers(type);
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

router.use('/patients', routeRessource('patients', TOUS_LES_ROLES, ['admin', 'secretaire'], {
  lister: Patients.lister,
  detail: Patients.detail,
  supprimer: Patients.supprimer,
}));
router.use('/medecins', routeRessource('medecins', TOUS_LES_ROLES, ['admin'], {
  lister: Medecins.lister,
  filtres: Medecins.listeFiltres,
  detail: Medecins.detail,
  supprimer: Medecins.supprimer,
}));
router.use('/rdv', routeRessource('rdv', TOUS_LES_ROLES, ['admin', 'secretaire'], {
  lister: Rdv.lister,
  changerStatut: Rdv.changerStatut,
  supprimer: Rdv.supprimer,
  rolesStatut: TOUS_LES_ROLES,
}));
router.use('/dossiers', routeRessource('dossiers', ['admin', 'medecin'], ['admin', 'medecin'], {
  lister: Dossiers.lister,
  detail: Dossiers.detail,
  fichier: Dossiers.fichier,
  avantEcriture: Dossiers.verifierModificationMedecin,
}));

export default router;
