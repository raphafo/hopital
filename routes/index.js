import { Router } from 'express';
import health from './health.js';
import auth from './auth.js';
import users from './users.js';
import dashboard from './dashboard.js';
import clinical from './clinical.js';

const router = Router();

router.use('/health', health);
router.use('/auth', auth);
router.use('/dashboard', dashboard);
router.use('/users', users);
router.use('/', clinical);

export default router;
