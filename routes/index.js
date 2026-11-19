// Routeur principal : envoie chaque /api/... vers le bon fichier de routes

import { Router } from 'express';
import health from './health.js';
import auth from './auth.js';
import users from './users.js';
import dashboard from './dashboard.js';
import clinical from './clinical.js';
import stats from './stats.js';

const router = Router();

router.use('/health', health);       // test que l'API et la base marchent
router.use('/auth', auth);           // inscription, connexion, déconnexion
router.use('/dashboard', dashboard); // ancienne version du tableau de bord (plus appelée par les pages)
router.use('/stats', stats);         // stats et historique du tableau de bord
router.use('/users', users);         // gestion des comptes par l'admin
router.use('/', clinical);           // /patients, /medecins, /rdv, /dossiers

export default router;
