const LIBELLES_ROLES = { admin: 'Administrateur', medecin: 'Médecin', secretaire: 'Secrétaire' };

function echapperHtml(texte) {
  const d = document.createElement('div');
  d.textContent = texte ?? '';
  return d.innerHTML.replace(/"/g, '&quot;');
}

async function chargerSession({ exiger = false } = {}) {
  let user = null;
  try { ({ user } = await api('/api/auth/moi')); } catch { /* visiteur non connecté */ }

  if (!user && exiger) {
    location.href = 'auth.html';
    return null;
  }

  const zone = document.getElementById('zone-session');
  if (zone) {
    if (!user) {
      zone.innerHTML = '<a class="btn btn-light btn-sm fw-semibold" href="auth.html">Connexion</a>';
    } else {
      const pages = window.POLITIQUE_ROLES[user.role]?.pages || [];
      const pageCourante = location.pathname.split('/').pop();
      const liens = [
        { id: 'gestion', href: 'gestion.html', label: 'Gestion' },
        { id: 'formulaire', href: 'formulaire.html', label: 'Formulaires' },
        { id: 'dashboard', href: 'dashboard.html', label: 'Tableau de bord' },
        { id: 'users', href: 'auth.html', label: 'Utilisateurs' },
      ].filter((lien) => pages.includes(lien.id) && lien.href !== pageCourante);
      const navigation = liens.map((lien) =>
        `<a class="btn btn-outline-light btn-sm" href="${lien.href}">${lien.label}</a>`
      ).join('');
      zone.innerHTML = `${navigation}
        <span class="pastille-session">${echapperHtml(user.prenom)} ${echapperHtml(user.nom)} · ${LIBELLES_ROLES[user.role] || user.role}</span>
        <button type="button" class="btn btn-outline-light btn-sm" id="btn-deconnexion">Déconnexion</button>`;
      document.getElementById('btn-deconnexion')?.addEventListener('click', async () => {
        try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* on quitte quand même */ }
        location.href = 'auth.html';
      });
    }
  }

  const lienDashboard = document.getElementById('nav-dashboard');
  if (lienDashboard) {
    lienDashboard.closest('.nav-item').classList.toggle('d-none', !user || !window.POLITIQUE_ROLES[user.role]?.pages.includes('dashboard'));
  }
  return user;
}
