// Petit utilitaire pour appeler l'API : JSON dans les deux sens, erreurs lisibles.
// Utilisé par toutes les pages à la place de fetch().
// ex : const { patients } = await api('/api/patients');
//      await api('/api/rdv', { method: 'POST', body: { ... } });
async function api(url, { method = 'GET', body } = {}) {
  // same-origin : le cookie de connexion est envoyé avec la requête
  const options = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  // si le serveur ne répond pas du tout (pas d'internet, serveur éteint)
  let reponse;
  try {
    reponse = await fetch(url, options);
  } catch {
    const err = new Error('Impossible de joindre le serveur. Vérifiez votre connexion.');
    err.status = 0;
    throw err;
  }

  let data = {};
  try { data = await reponse.json(); } catch { /* réponse sans corps JSON */ }

  // code d'erreur (400, 401, 403, 404, 409, 500...) : on lance une erreur avec le message du serveur
  // err.champs contient les erreurs par champ pour les afficher sous les inputs
  if (!reponse.ok) {
    const err = new Error(data.erreur || 'Une erreur est survenue.');
    err.status = reponse.status;
    err.champs = data.champs || {};
    throw err;
  }
  return data;
}
