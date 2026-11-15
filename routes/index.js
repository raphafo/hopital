import { Router } from 'express';
import health from './health.js';

const router = Router();

router.use('/health', health);

// À ajouter au fur et à mesure :
// router.use('/auth', auth);
// router.use('/patients', patients);
// router.use('/medecins', medecins);
// router.use('/rdv', rdv);
// router.use('/dossiers', dossiers);
// router.use('/stats', stats);

export default router;
