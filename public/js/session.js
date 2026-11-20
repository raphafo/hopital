// Récupère l'utilisateur connecté et monte la barre de navigation commune (nav.js).
// exiger : redirige vers la page de connexion si personne n'est connecté.
// actif : identifiant de la page courante dans le menu.
function echapperHtml(texte) {
  const d = document.createElement('div');
  d.textContent = texte ?? '';
  return d.innerHTML.replace(/"/g, '&quot;');
}

async function chargerSession({ exiger = false, actif = null, liensVisiteur } = {}) {
  let user = null;
  try { ({ user } = await api('/api/auth/moi')); } catch { /* visiteur non connecté */ }

  if (!user && exiger) {
    location.href = 'auth.html';
    return null;
  }

  monterNav(actif, user, { liensVisiteur });
  return user;
}
