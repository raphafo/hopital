// Vérification des rôles. À placer après exigerConnexion (qui remplit req.user).
// 401 = pas connecté, 403 = connecté mais pas le droit.

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
// C'est celle qu'on utilise sur toutes les routes de données.
export function exigerRoleEnBase(...rolesAutorises) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ erreur: 'Non authentifié' });
      const { rows } = await query('SELECT role, actif FROM users WHERE id = $1', [req.user.id]);
      const u = rows[0];
      // compte supprimé ou désactivé par l'admin
      if (!u || !u.actif) return res.status(401).json({ erreur: 'Compte introuvable ou désactivé' });
      if (!rolesAutorises.includes(u.role)) {
        return res.status(403).json({ erreur: 'Accès refusé pour votre rôle' });
      }
      // on garde le rôle à jour pour les contrôleurs qui suivent
      req.user.role = u.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
