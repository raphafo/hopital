import { Router } from 'express';
import { creerHandlers } from '../controllers/clinicalController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';

const router = Router();
const TOUS_LES_ROLES = ['admin', 'medecin', 'secretaire'];

function routeRessource(type, rolesLecture, rolesEcriture) {
  const sousRoute = Router();
  const handlers = creerHandlers(type);
  sousRoute.get('/', exigerConnexion, exigerRoleEnBase(...rolesLecture), handlers.lister);
  sousRoute.post('/', exigerConnexion, exigerRoleEnBase(...rolesEcriture), handlers.creer);
  sousRoute.put('/:id', exigerConnexion, exigerRoleEnBase(...rolesEcriture), handlers.modifier);
  sousRoute.delete('/:id', exigerConnexion, exigerRoleEnBase(...rolesEcriture), handlers.supprimer);
  return sousRoute;
}

router.use('/patients', routeRessource('patients', TOUS_LES_ROLES, ['admin', 'secretaire']));
router.use('/medecins', routeRessource('medecins', TOUS_LES_ROLES, ['admin']));
router.use('/rdv', routeRessource('rdv', TOUS_LES_ROLES, TOUS_LES_ROLES));
router.use('/dossiers', routeRessource('dossiers', ['admin', 'medecin'], ['admin', 'medecin']));

export default router;
