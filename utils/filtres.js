function erreurRequete(message) {
  const erreur = new Error(message);
  erreur.status = 400;
  return erreur;
}

function parametreTexte(valeur, nom, maximum) {
  if (typeof valeur !== 'string') throw erreurRequete(`Paramètre ${nom} invalide.`);
  const texte = valeur.trim();
  if (texte.length > maximum) throw erreurRequete(`Paramètre ${nom} trop long.`);
  return texte || null;
}

export function lireRecherche(query) {
  if (query.q == null || query.q === '') return null;
  return parametreTexte(query.q, 'q', 100);
}

export function lirePagination(query, { limiteParDefaut = 20, limiteMax = 100 } = {}) {
  const lireEntier = (valeur, nom, defaut, maximum) => {
    if (valeur == null) return defaut;
    if (typeof valeur !== 'string' || !/^[1-9]\d*$/.test(valeur)) {
      throw erreurRequete(`Paramètre ${nom} invalide.`);
    }
    const nombre = Number(valeur);
    if (!Number.isSafeInteger(nombre) || nombre > maximum) {
      throw erreurRequete(`Paramètre ${nom} hors limites.`);
    }
    return nombre;
  };

  const limite = lireEntier(query.limite, 'limite', limiteParDefaut, limiteMax);
  const page = lireEntier(query.page, 'page', 1, Math.floor(Number.MAX_SAFE_INTEGER / limite));
  return { page, limite, offset: (page - 1) * limite };
}

function dateValide(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function lireFiltres(query, definitions) {
  const filtres = {};
  for (const [nom, definition] of Object.entries(definitions)) {
    const valeur = query[nom];
    if (valeur == null || valeur === '') {
      filtres[nom] = null;
      continue;
    }
    if (typeof valeur !== 'string') return { filtres, erreur: nom };

    if (definition.enumeration) {
      if (!definition.enumeration.includes(valeur)) return { filtres, erreur: nom };
      filtres[nom] = valeur;
    } else if (definition.booleen) {
      if (valeur !== 'true' && valeur !== 'false') return { filtres, erreur: nom };
      filtres[nom] = valeur === 'true';
    } else if (definition.entier) {
      if (!/^[1-9]\d*$/.test(valeur) || !Number.isSafeInteger(Number(valeur))) {
        return { filtres, erreur: nom };
      }
      filtres[nom] = Number(valeur);
    } else if (definition.date) {
      if (!dateValide(valeur)) return { filtres, erreur: nom };
      filtres[nom] = valeur;
    } else if (definition.texte) {
      const texte = valeur.trim();
      if (!texte || texte.length > (definition.maximum || 100)) return { filtres, erreur: nom };
      filtres[nom] = texte;
    } else {
      return { filtres, erreur: nom };
    }
  }
  return { filtres, erreur: null };
}

export function reponsePage(items, pagination, total) {
  const pages = Math.ceil(total / pagination.limite);
  return {
    items,
    page: pagination.page,
    limite: pagination.limite,
    pages,
    total,
  };
}

export function idValide(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
