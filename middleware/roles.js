// Utilisation : router.delete('/:id', exigerConnexion, exigerRole('admin'), handler)
export function exigerRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erreur: 'Non authentifié' });
    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ erreur: 'Accès refusé pour votre rôle' });
    }
    next();
  };
}
