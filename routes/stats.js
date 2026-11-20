// Routes /api/stats du tableau de bord, admin seulement (appelées par public/js/dashboard.js)

import { Router } from 'express';
import { activites, dashboard } from '../controllers/statsController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';

const router = Router();
// connecté + admin, réutilisé sur les deux routes
const admin = [exigerConnexion, exigerRoleEnBase('admin')];

router.get('/dashboard', ...admin, dashboard); // KPI, graphiques et récapitulatifs
router.get('/activites', ...admin, activites); // historique avec recherche et filtre

export default router;
