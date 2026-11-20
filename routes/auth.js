// Routes /api/auth (le code est dans controllers/authController.js)

import { Router } from 'express';
import { inscription, connexion, deconnexion, moi } from '../controllers/authController.js';
import { exigerConnexion } from '../middleware/auth.js';

const router = Router();

router.post('/register', inscription);    // créer un compte
router.post('/login', connexion);         // se connecter, pose le cookie
router.post('/logout', deconnexion);      // se déconnecter, efface le cookie
router.get('/moi', exigerConnexion, moi); // renvoie l'utilisateur connecté (appelé par toutes les pages)

export default router;
