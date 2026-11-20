// Routes /api/health pour tester rapidement si le site marche (utile après un déploiement)

import { Router } from 'express';
import { query } from '../config/db.js';

const router = Router();

// Vérifie que l'API répond
router.get('/', (req, res) => {
  res.json({ statut: 'ok', heure: new Date().toISOString() });
});

// Vérifie la connexion à la base de données
router.get('/db', async (req, res) => {
  try {
    const { rows } = await query('SELECT NOW() AS maintenant');
    res.json({ statut: 'ok', base: 'connectée', maintenant: rows[0].maintenant });
  } catch (err) {
    console.error('[health/db]', err.message);
    res.status(500).json({ statut: 'erreur', base: 'inaccessible' });
  }
});

export default router;
