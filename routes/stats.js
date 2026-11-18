import { Router } from 'express';
import { activites, dashboard } from '../controllers/statsController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';

const router = Router();
const admin = [exigerConnexion, exigerRoleEnBase('admin')];

router.get('/dashboard', ...admin, dashboard);
router.get('/activites', ...admin, activites);

export default router;
