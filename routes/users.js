// Routes /api/users pour gérer les comptes (section Utilisateurs de auth.html)

import { Router } from 'express';
import { lister, modifier } from '../controllers/userController.js';
import { exigerConnexion } from '../middleware/auth.js';
import { exigerRoleEnBase } from '../middleware/roles.js';

const router = Router();

// Gestion des utilisateurs : réservée aux administrateurs (rôle vérifié en base)
// router.use applique la vérif à toutes les routes en dessous
router.use(exigerConnexion, exigerRoleEnBase('admin'));
router.get('/', lister);        // liste des comptes
router.patch('/:id', modifier); // changer le rôle ou activer/désactiver un compte

export default router;
