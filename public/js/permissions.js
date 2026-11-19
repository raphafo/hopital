// Droits de chaque rôle côté pages.
// pages : les pages qui apparaissent dans le menu
// resources : ce que le rôle peut faire sur chaque type de données
//   (read = voir, create = ajouter, update = modifier, delete = supprimer, status = changer le statut d'un rdv)
// Ça sert seulement à cacher les boutons et liens inutiles : la vraie sécurité
// est vérifiée par le serveur (routes/clinical.js).
// Object.freeze empêche de modifier cet objet depuis la console du navigateur.
window.POLITIQUE_ROLES = Object.freeze({
  admin: {
    pages: ['accueil', 'gestion', 'formulaire', 'dashboard', 'users'],
    resources: {
      patients: ['read', 'create', 'update', 'delete'],
      medecins: ['read', 'create', 'update', 'delete'],
      rdv: ['read', 'create', 'update', 'delete', 'status'],
      dossiers: ['read', 'create', 'update', 'delete'],
      users: ['read', 'update'],
    },
  },
  secretaire: {
    pages: ['accueil', 'gestion', 'formulaire'],
    resources: {
      patients: ['read', 'create', 'update', 'delete'],
      medecins: ['read'],
      rdv: ['read', 'create', 'update', 'delete', 'status'],
      dossiers: [],
      users: [],
    },
  },
  medecin: {
    pages: ['accueil', 'gestion', 'formulaire'],
    resources: {
      patients: ['read'],
      medecins: ['read'],
      rdv: ['read', 'status'],
      dossiers: ['read', 'create', 'update', 'delete'],
      users: [],
    },
  },
});
