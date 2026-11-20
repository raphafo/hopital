
// Route /api/dashboard : première version du tableau de bord.
// Les pages ne l'appellent plus, dashboard.js utilise /api/stats/dashboard à la place.
import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';

const router = Router();

router.get('/', exigerConnexion, exigerRoleEnBase('admin'), getDashboard);

export default router;
