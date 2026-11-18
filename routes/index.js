import { Router } from 'express';
import health from './health.js';
import auth from './auth.js';
import users from './users.js';
import dashboard from './dashboard.js';
import clinical from './clinical.js';
import stats from './stats.js';

const router = Router();

router.use('/health', health);
router.use('/auth', auth);
router.use('/dashboard', dashboard);
router.use('/stats', stats);
router.use('/users', users);
router.use('/', clinical);

export default router;
