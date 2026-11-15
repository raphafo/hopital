// Petit utilitaire pour appeler l'API : JSON dans les deux sens, erreurs lisibles.
async function api(url, { method = 'GET', body } = {}) {
  const options = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

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

  if (!reponse.ok) {
    const err = new Error(data.erreur || 'Une erreur est survenue.');
    err.status = reponse.status;
    err.champs = data.champs || {};
    throw err;
  }
  return data;
}
