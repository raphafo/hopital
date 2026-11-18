import { Router } from 'express';
import { creerHandlers } from '../controllers/clinicalController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';
import * as Patients from '../controllers/patientController.js';
import * as Medecins from '../controllers/medecinController.js';
import * as Rdv from '../controllers/rdvController.js';

const router = Router();
const TOUS_LES_ROLES = ['admin', 'medecin', 'secretaire'];

function routeRessource(type, rolesLecture, rolesEcriture, options = {}) {
  const sousRoute = Router();
  const handlers = creerHandlers(type);
  if (options.filtres) {
    sousRoute.get('/filtres', exigerConnexion, exigerRoleEnBase(...rolesLecture), options.filtres);
  }
  sousRoute.get('/', exigerConnexion, exigerRoleEnBase(...rolesLecture), options.lister || handlers.lister);
  if (options.detail) {
    sousRoute.get('/:id', exigerConnexion, exigerRoleEnBase(...rolesLecture), options.detail);
  }
  sousRoute.post('/', exigerConnexion, exigerRoleEnBase(...rolesEcriture), handlers.creer);
  sousRoute.put('/:id', exigerConnexion, exigerRoleEnBase(...rolesEcriture), handlers.modifier);
  if (options.changerStatut) {
    sousRoute.patch('/:id/statut', exigerConnexion, exigerRoleEnBase(...rolesEcriture), options.changerStatut);
  }
  sousRoute.delete('/:id', exigerConnexion, exigerRoleEnBase(...rolesEcriture), options.supprimer || handlers.supprimer);
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
router.use('/rdv', routeRessource('rdv', TOUS_LES_ROLES, TOUS_LES_ROLES, {
  lister: Rdv.lister,
  changerStatut: Rdv.changerStatut,
  supprimer: Rdv.supprimer,
}));
router.use('/dossiers', routeRessource('dossiers', ['admin', 'medecin'], ['admin', 'medecin']));

export default router;
