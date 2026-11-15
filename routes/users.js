import { Router } from 'express';
import { lister, modifier } from '../controllers/userController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';

const router = Router();

// Gestion des utilisateurs : réservée aux administrateurs (rôle vérifié en base)
router.use(exigerConnexion, exigerRoleEnBase('admin'));
router.get('/', lister);
router.patch('/:id', modifier);

export default router;
