import { Router } from 'express';
import health from './health.js';
import auth from './auth.js';
import users from './users.js';

const router = Router();

router.use('/health', health);
router.use('/auth', auth);
router.use('/users', users);

// À ajouter au fur et à mesure :
// router.use('/patients', patients);
// router.use('/medecins', medecins);
// router.use('/rdv', rdv);
// router.use('/dossiers', dossiers);
// router.use('/stats', stats);

export default router;
