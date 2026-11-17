
import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';

const router = Router();

router.get('/', exigerConnexion, exigerRoleEnBase('admin', 'medecin', 'secretaire'), getDashboard);

export default router;
