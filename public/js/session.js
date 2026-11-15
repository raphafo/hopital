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
    zone.innerHTML = user
      ? `<span class="pastille-session">${echapperHtml(user.prenom)} ${echapperHtml(user.nom)} · ${LIBELLES_ROLES[user.role] || user.role}</span>
         <button type="button" class="btn btn-outline-light btn-sm" id="btn-deconnexion">Déconnexion</button>`
      : '<a class="btn btn-light btn-sm fw-semibold" href="auth.html">Connexion</a>';
    document.getElementById('btn-deconnexion')?.addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* on quitte quand même */ }
      location.href = 'auth.html';
    });
  }
  return user;
}
