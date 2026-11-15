import { query } from '../config/db.js';

// Utilisation : router.delete('/:id', exigerConnexion, exigerRole('admin'), handler)
// Le rôle est lu dans le jeton (rapide).
export function exigerRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erreur: 'Non authentifié' });
    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ erreur: 'Accès refusé pour votre rôle' });
    }
    next();
  };
}

// Variante plus stricte : relit le rôle dans la base (un admin rétrogradé perd ses droits immédiatement,
// sans attendre l'expiration de son jeton). À utiliser pour les actions sensibles.
export function exigerRoleEnBase(...rolesAutorises) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ erreur: 'Non authentifié' });
      const { rows } = await query('SELECT role, actif FROM users WHERE id = $1', [req.user.id]);
      const u = rows[0];
      if (!u || !u.actif) return res.status(401).json({ erreur: 'Compte introuvable ou désactivé' });
      if (!rolesAutorises.includes(u.role)) {
        return res.status(403).json({ erreur: 'Accès refusé pour votre rôle' });
      }
      req.user.role = u.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
