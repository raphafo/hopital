// Barre de navigation commune à toutes les pages.
// Chaque page appelle monterNav('page-active', utilisateur), avec utilisateur = null pour un visiteur.
// Les liens affichés dépendent du rôle (voir POLITIQUE_ROLES dans permissions.js).
// Pour ajouter une page au menu, ajouter une ligne dans LIENS_NAV.
const LIENS_NAV = [
  { id: 'accueil',   href: 'accueil.html',    libelle: 'Accueil' },
  { id: 'gestion',   href: 'gestion.html',    libelle: 'Gestion' },
  { id: 'formulaire',href: 'formulaire.html', libelle: 'Formulaires' },
  { id: 'dashboard', href: 'dashboard.html',  libelle: 'Tableau de bord' },
  { id: 'users',     href: 'auth.html',       libelle: 'Utilisateurs' },
];
const NOMS_ROLES = { admin: 'Administrateur', medecin: 'Médecin', secretaire: 'Secrétaire' };

function echapper(texte) {
  const d = document.createElement('div');
  d.textContent = texte;
  return d.innerHTML;
}

// options.liensVisiteur : liens montrés à un visiteur non connecté (par défaut : Accueil).
// La page d'accueil y passe ses ancres (Services, Présentation, Contact).
function monterNav(actif, user, { liensVisiteur } = {}) {
  const conteneur = document.getElementById('nav');
  if (!conteneur) return;

  const pages = user ? window.POLITIQUE_ROLES[user.role]?.pages || [] : [];
  const liensVisibles = user
    ? LIENS_NAV.filter((l) => pages.includes(l.id))
    : liensVisiteur || [LIENS_NAV[0]];

  const liens = liensVisibles
    .map((l) => {
      const estActif = l.id === actif;
      return `<li class="nav-item"><a class="nav-link${estActif ? ' active' : ''}" href="${l.href}"${estActif ? ' aria-current="page"' : ''}>${l.libelle}</a></li>`;
    })
    .join('');

  let session = '';
  if (user) {
    session = `
      <span class="pastille-session">${echapper(user.prenom)} ${echapper(user.nom)} · ${NOMS_ROLES[user.role] || user.role}</span>
      <button type="button" class="btn-deconnexion" id="btn-nav-deconnexion">Déconnexion</button>`;
  } else if (actif !== 'connexion') {
    session = '<a class="btn btn-light btn-sm fw-semibold" href="auth.html">Connexion</a>';
  }

  conteneur.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-hopital sticky-top" aria-label="Navigation principale" data-bs-theme="dark">
      <div class="container">
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="accueil.html">
          <img src="image/logo.svg" alt="" class="logo-hopital" width="36" height="36">
          Gestion hospitalière
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu-principal"
                aria-controls="menu-principal" aria-expanded="false" aria-label="Ouvrir ou fermer le menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menu-principal">
          <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1">${liens}</ul>
          ${session ? `<div class="zone-session d-flex flex-wrap align-items-center gap-3 ms-lg-3 py-2 py-lg-0">${session}</div>` : ''}
        </div>
      </div>
    </nav>`;

  document.getElementById('btn-nav-deconnexion')?.addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* on quitte quand même */ }
    window.location.href = 'auth.html';
  });
}
