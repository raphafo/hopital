import { Router } from 'express';
import { inscription, connexion, deconnexion, moi } from '../controllers/authController.js';
import { exigerConnexion } from '../middleware/auth.js';

const router = Router();

router.post('/register', inscription);
router.post('/login', connexion);
router.post('/logout', deconnexion);
router.get('/moi', exigerConnexion, moi);

export default router;
