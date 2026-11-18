// Barre de navigation commune. Chaque page appelle monterNav('page-active', utilisateur).
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

function monterNav(actif, user) {
  const pages = window.POLITIQUE_ROLES[user.role]?.pages || [];
  const liens = LIENS_NAV
    .filter((l) => pages.includes(l.id))
    .map((l) => `<li class="nav-item"><a class="nav-link${l.id === actif ? ' active fw-semibold' : ''}" href="${l.href}">${l.libelle}</a></li>`)
    .join('');

  document.getElementById('nav').innerHTML = `
    <nav class="navbar navbar-expand navbar-hopital">
      <div class="container flex-wrap">
        <a class="navbar-brand fw-semibold" href="index.html">Gestion hospitalière</a>
        <ul class="navbar-nav me-auto">${liens}</ul>
        <div class="d-flex align-items-center gap-3">
          <a class="text-white small text-decoration-none" href="auth.html">${echapper(user.prenom)} ${echapper(user.nom)} · ${NOMS_ROLES[user.role] || user.role}</a>
          <button type="button" class="btn btn-sm btn-outline-light" id="btn-nav-deconnexion">Déconnexion</button>
        </div>
      </div>
    </nav>`;

  document.getElementById('btn-nav-deconnexion').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* on quitte quand même */ }
    window.location.href = 'auth.html';
  });
}
