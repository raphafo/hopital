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
