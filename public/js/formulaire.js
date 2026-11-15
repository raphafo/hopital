const $ = (sel) => document.querySelector(sel);
const ONGLETS_PAR_ROLE = {
  admin: ['patients', 'medecins', 'rdv', 'dossiers'],
  secretaire: ['patients', 'rdv'],
  medecin: ['rdv', 'dossiers'],
};
const SPECIALITES = ['Médecine générale', 'Cardiologie', 'Pédiatrie', 'Orthopédie', 'Dermatologie'];
const GROUPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STATUTS = { planifie: 'Planifié', termine: 'Terminé', annule: 'Annulé' };
const TAILLE_MAX = 2 * 1024 * 1024;
const RE_NOM = /^[\p{L}][\p{L} '\-]{1,79}$/u;
const RE_TEL = /^5\d{3} ?\d{4}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const donnees = { patients: [], medecins: [], rdv: [], dossiers: [] };
let courant = 'patients';
let edition = null;
let onglets = [];

const jour = (v) => String(v ?? '').slice(0, 10);
const heure = (v) => String(v ?? '').slice(0, 5);
const dateFr = (v) => jour(v).split('-').reverse().join('/');
const nomPatient = (id) => { const p = donnees.patients.find((x) => x.id == id); return p ? `${p.prenom} ${p.nom}` : `Patient n° ${id}`; };
const nomMedecin = (id) => { const m = donnees.medecins.find((x) => x.id == id); return m ? `Dr ${m.nom}` : `Médecin n° ${id}`; };
const optPatients = () => donnees.patients.map((p) => [p.id, `${p.prenom} ${p.nom}`]);
const optMedecins = () => donnees.medecins.map((m) => [m.id, `Dr ${m.prenom} ${m.nom} · ${m.specialite}${m.disponible ? '' : ' (indisponible)'}`]);
const optRdvDuPatient = () => {
  const pid = $('#formulaire')?.elements.patient_id?.value;
  return donnees.rdv.filter((r) => r.patient_id == pid).map((r) => [r.id, `${dateFr(r.date_rdv)} ${heure(r.heure_rdv)} · ${r.motif}`]);
};
const FORMS = {
  patients: {
    url: '/api/patients', onglet: 'Patients', article: 'le patient', titre: 'Nouveau patient', liste: 'Derniers patients',
    champs: [
      { n: 'prenom', l: 'Prénom', ph: 'Prénom', req: 1, max: 80, motif: RE_NOM, err: 'Prénom invalide (2 à 80 lettres, espaces, tirets ou apostrophes).' },
      { n: 'nom', l: 'Nom', ph: 'Nom', req: 1, max: 80, motif: RE_NOM, err: 'Nom invalide (2 à 80 lettres, espaces, tirets ou apostrophes).' },
      { n: 'date_naissance', l: 'Date de naissance', t: 'date', req: 1, passe: 1 },
      { n: 'sexe', l: 'Sexe', t: 'select', req: 1, vide: 'Choisir…', opt: () => [['F', 'Féminin'], ['M', 'Masculin']] },
      { n: 'telephone', l: 'Téléphone', ph: '5xxx xxxx', max: 30, motif: RE_TEL, err: 'Format attendu : 5xxx xxxx.' },
      { n: 'email', l: 'Email', t: 'email', ph: 'email@exemple.mu', max: 150, motif: RE_EMAIL, err: 'Adresse email invalide.' },
      { n: 'adresse', l: 'Adresse', ph: 'Adresse complète', w: 1, max: 255 },
      { n: 'groupe_sanguin', l: 'Groupe sanguin', t: 'select', vide: 'Non renseigné', opt: () => GROUPES.map((g) => [g, g]) },
      { n: 'allergies', l: 'Allergies', t: 'textarea', ph: 'Allergies connues', w: 1 },
      { n: 'assure', l: 'Patient assuré', t: 'check', w: 1 },
    ],
    titreItem: (d) => `${d.prenom} ${d.nom}`,
    sousTitre: (d) => `${d.groupe_sanguin || '—'} · ${d.adresse || '—'}`,
  },
  medecins: {
    url: '/api/medecins', onglet: 'Médecins', article: 'le médecin', titre: 'Nouveau médecin', liste: 'Derniers médecins',
    champs: [
      { n: 'prenom', l: 'Prénom', ph: 'Prénom', req: 1, max: 80, motif: RE_NOM, err: 'Prénom invalide (2 à 80 lettres, espaces, tirets ou apostrophes).' },
      { n: 'nom', l: 'Nom', ph: 'Nom', req: 1, max: 80, motif: RE_NOM, err: 'Nom invalide (2 à 80 lettres, espaces, tirets ou apostrophes).' },
      { n: 'specialite', l: 'Spécialité', t: 'select', req: 1, vide: 'Choisir…', opt: () => SPECIALITES.map((s) => [s, s]) },
      { n: 'telephone', l: 'Téléphone', ph: '5xxx xxxx', max: 30, motif: RE_TEL, err: 'Format attendu : 5xxx xxxx.' },
      { n: 'email', l: 'Email', t: 'email', ph: 'prenom.nom@hopital.mu', max: 150, motif: RE_EMAIL, err: 'Adresse email invalide.' },
      { n: 'photo_url', l: 'Photo (adresse du fichier)', t: 'url', ph: 'assets/dr-nom.jpg', max: 255 },
      { n: 'disponible', l: 'Disponible', t: 'check', w: 1, defaut: true },
    ],
    titreItem: (d) => `Dr ${d.prenom} ${d.nom}`,
    sousTitre: (d) => `${d.specialite} · ${d.disponible ? 'Disponible' : 'Indisponible'}`,
  },
  rdv: {
    url: '/api/rdv', onglet: 'Rendez-vous', article: 'le rendez-vous', titre: 'Nouveau rendez-vous', liste: 'Derniers rendez-vous',
    champs: [
      { n: 'patient_id', l: 'Patient', t: 'select', req: 1, num: 1, vide: 'Choisir un patient…', opt: optPatients },
      { n: 'medecin_id', l: 'Médecin', t: 'select', req: 1, num: 1, vide: 'Choisir un médecin…', opt: optMedecins },
      { n: 'date_rdv', l: 'Date', t: 'date', req: 1 },
      { n: 'heure_rdv', l: 'Heure', t: 'time', req: 1 },
      { n: 'motif', l: 'Motif', ph: 'Motif de la consultation', req: 1, w: 1, max: 255 },
      { n: 'statut', l: 'Statut', t: 'select', req: 1, opt: () => Object.entries(STATUTS), defaut: 'planifie' },
    ],
    titreItem: (d) => nomPatient(d.patient_id),
    sousTitre: (d) => `${dateFr(d.date_rdv)} ${heure(d.heure_rdv)} · ${nomMedecin(d.medecin_id)} · ${STATUTS[d.statut] || d.statut}`,
    // Même règle que l'index SQL uq_rdv_creneau : un médecin, un créneau, sauf rendez-vous annulé.
    verifier: (v) => (v.statut !== 'annule' && donnees.rdv.some((r) =>
      r.id !== edition?.id && r.statut !== 'annule' && r.medecin_id == v.medecin_id &&
      jour(r.date_rdv) === v.date_rdv && heure(r.heure_rdv) === v.heure_rdv))
      ? { heure_rdv: 'Ce créneau est déjà réservé pour ce médecin.' } : null,
  },
  dossiers: {
    url: '/api/dossiers', onglet: 'Dossiers', article: 'le dossier', titre: 'Nouveau dossier', liste: 'Derniers dossiers',
    champs: [
      { n: 'patient_id', l: 'Patient', t: 'select', req: 1, num: 1, vide: 'Choisir un patient…', opt: optPatients },
      { n: 'medecin_id', l: 'Médecin', t: 'select', num: 1, vide: 'Non précisé', opt: optMedecins },
      { n: 'rendez_vous_id', l: 'Rendez-vous lié', t: 'select', num: 1, w: 1, vide: 'Aucun', opt: optRdvDuPatient },
      { n: 'diagnostic', l: 'Diagnostic', t: 'textarea', ph: 'Diagnostic', req: 1, w: 1 },
      { n: 'traitement', l: 'Traitement', t: 'textarea', ph: 'Traitement prescrit', w: 1 },
      { n: 'notes', l: 'Notes', t: 'textarea', ph: 'Notes complémentaires', w: 1 },
      { n: 'fichier', l: 'Pièce jointe (PDF, 2 Mo max)', t: 'file', w: 1 },
    ],
    titreItem: (d) => nomPatient(d.patient_id),
    sousTitre: (d) => `${dateFr(d.created_at)} · ${String(d.diagnostic).slice(0, 40)}`,
  },
};

function champHtml(c) {
  const id = `f-${c.n}`;
  const col = c.w ? 'col-12' : 'col-md-6';
  if (c.t === 'check') {
    return `<div class="${col}"><div class="form-check"><input class="form-check-input" type="checkbox" id="${id}" name="${c.n}">
      <label class="form-check-label" for="${id}">${c.l}</label></div></div>`;
  }
  let ctrl;
  if (c.t === 'select') ctrl = `<select class="form-select" id="${id}" name="${c.n}"></select>`;
  else if (c.t === 'textarea') ctrl = `<textarea class="form-control" id="${id}" name="${c.n}" rows="3" placeholder="${c.ph || ''}"></textarea>`;
  else if (c.t === 'file') ctrl = `<input class="form-control" type="file" id="${id}" name="${c.n}" accept="application/pdf"><div class="form-text" id="aide-fichier"></div>`;
  else ctrl = `<input class="form-control" type="${c.t || 'text'}" id="${id}" name="${c.n}" placeholder="${c.ph || ''}" ${c.max ? `maxlength="${c.max}"` : ''}>`;
  return `<div class="${col}"><label class="form-label" for="${id}">${c.l}${c.req ? ' <span aria-hidden="true">*</span>' : ''}</label>${ctrl}<div class="invalid-feedback"></div></div>`;
}

function remplirSelect(c) {
  const el = $('#formulaire').elements[c.n];
  const vide = c.vide ? `<option value="">${c.vide}</option>` : '';
  el.innerHTML = vide + c.opt().map(([v, l]) => `<option value="${echapperHtml(String(v))}">${echapperHtml(l)}</option>`).join('');
}

function afficher() {
  const f = FORMS[courant];
  const form = $('#formulaire');
  $('#titre-form').textContent = edition ? `Modifier ${f.article}` : f.titre;
  $('#titre-liste').textContent = f.liste;
  form.innerHTML = f.champs.map(champHtml).join('') + `
    <div class="col-12 d-flex gap-2">
      <button type="submit" class="btn btn-principal">${edition ? 'Enregistrer les modifications' : 'Enregistrer'}</button>
      <button type="button" class="btn btn-outline-secondary" id="btn-annuler">Annuler</button>
    </div>`;

  for (const c of f.champs) {
    const el = form.elements[c.n];
    if (c.t === 'select') remplirSelect(c);          // l'ordre des champs compte : patient avant rendez-vous lié
    if (c.t === 'file') continue;
    const valeur = edition ? edition[c.n] : c.defaut;
    if (c.t === 'check') el.checked = edition ? !!valeur : valeur !== false && !!valeur;
    else if (valeur != null) el.value = c.t === 'date' ? jour(valeur) : c.t === 'time' ? heure(valeur) : valeur;
  }
  if (edition?.fichier_nom) $('#aide-fichier').textContent = `Fichier actuel : ${edition.fichier_nom}. Choisissez-en un autre pour le remplacer.`;

  $('#onglets').innerHTML = onglets.map((k) => `
    <li class="nav-item" role="presentation"><button type="button" role="tab" class="nav-link ${k === courant ? 'active' : ''}"
      aria-selected="${k === courant}" data-onglet="${k}">${FORMS[k].onglet}</button></li>`).join('');

  const lignes = [...donnees[courant]].sort((a, b) => b.id - a.id).slice(0, 5);
  $('#liste').innerHTML = lignes.length ? lignes.map((d) => `
    <li><div><strong>${echapperHtml(f.titreItem(d))}</strong><small>${echapperHtml(f.sousTitre(d))}</small></div>
      <div class="text-nowrap"><button type="button" class="btn-lien" data-act="mod" data-id="${d.id}">Modifier</button>
      <button type="button" class="btn-lien danger" data-act="sup" data-id="${d.id}">Supprimer</button></div></li>`).join('')
    : '<li class="text-muted small">Aucun enregistrement. Remplissez le formulaire pour commencer.</li>';
}

function alerte(type, texte) {
  const a = $('#alerte-form');
  a.className = `alert alert-${type}`;
  a.textContent = texte;
}

function montrerErreurs(champs) {
  const form = $('#formulaire');
  form.querySelectorAll('.is-invalid').forEach((e) => e.classList.remove('is-invalid'));
  for (const [n, message] of Object.entries(champs)) {
    const el = form.elements[n];
    if (!el) continue;
    el.classList.add('is-invalid');
    const retour = el.closest('[class^="col-"]')?.querySelector('.invalid-feedback');
    if (retour) retour.textContent = message;
  }
  form.querySelector('.is-invalid')?.focus();
}


async function chargerDonnees() {
  const cles = Object.keys(donnees);
  const reponses = await Promise.allSettled(cles.map((k) => api(FORMS[k].url)));
  reponses.forEach((r, i) => { donnees[cles[i]] = r.status === 'fulfilled' ? (r.value[cles[i]] || []) : []; });
}

function lireFormulaire(f) {
  const form = $('#formulaire');
  const v = {};
  for (const c of f.champs) {
    if (c.t === 'file') continue;
    const el = form.elements[c.n];
    if (c.t === 'check') { v[c.n] = el.checked; continue; }
    const texte = el.value.trim();
    v[c.n] = texte === '' ? null : (c.num ? Number(texte) : texte);   // '' -> null (colonnes UNIQUE et facultatives)
  }
  return v;
}

function valider(f, v, fichier) {
  const e = {};
  const aujourdhui = new Date().toLocaleDateString('sv-SE');
  for (const c of f.champs) {
    const val = v[c.n];
    if (c.req && val == null) e[c.n] = 'Ce champ est obligatoire.';
    else if (val && c.motif && !c.motif.test(val)) e[c.n] = c.err;
    else if (val && c.passe && val > aujourdhui) e[c.n] = 'La date ne peut pas être dans le futur.';
  }
  if (fichier && fichier.type !== 'application/pdf') e.fichier = 'Seuls les fichiers PDF sont acceptés.';
  else if (fichier && fichier.size > TAILLE_MAX) e.fichier = 'Le fichier dépasse 2 Mo.';
  return e;
}

const versBase64 = (fichier) => new Promise((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1]);
  r.onerror = ko;
  r.readAsDataURL(fichier);
});

function gererErreur(err) {
  if (err.status === 401) { location.href = 'auth.html'; return; }
  if (Object.keys(err.champs || {}).length) {
    montrerErreurs(err.champs);
    alerte('danger', 'Corrigez les champs signalés.');
  } else {
    alerte('danger', err.message);
  }
}

async function rafraichir() {
  await chargerDonnees();
  afficher();
}



$('#onglets').addEventListener('click', (e) => {
  const b = e.target.closest('[data-onglet]');
  if (!b) return;
  courant = b.dataset.onglet;
  edition = null;
  $('#alerte-form').className = 'alert d-none';
  afficher();
});

$('#formulaire').addEventListener('input', (e) => e.target.classList.remove('is-invalid'));

$('#formulaire').addEventListener('change', (e) => {
  if (e.target.name !== 'patient_id') return;
  const lie = FORMS[courant].champs.find((c) => c.n === 'rendez_vous_id');
  if (lie) remplirSelect(lie);
});

$('#formulaire').addEventListener('click', (e) => {
  if (e.target.id !== 'btn-annuler') return;
  edition = null;
  $('#alerte-form').className = 'alert d-none';
  afficher();
});

$('#formulaire').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = FORMS[courant];
  const v = lireFormulaire(f);
  const fichier = e.target.elements.fichier?.files[0];
  const erreurs = { ...valider(f, v, fichier), ...(f.verifier?.(v) || {}) };
  if (Object.keys(erreurs).length) return montrerErreurs(erreurs);

  const bouton = e.target.querySelector('[type="submit"]');
  bouton.disabled = true;
  try {
    if (fichier) Object.assign(v, { fichier_nom: fichier.name, fichier_type: fichier.type, fichier_data: await versBase64(fichier) });
    const modif = !!edition;
    await api(modif ? `${f.url}/${edition.id}` : f.url, { method: modif ? 'PUT' : 'POST', body: v });
    edition = null;
    await rafraichir();
    alerte('success', modif ? 'Modifications enregistrées.' : 'Enregistrement effectué.');
  } catch (err) {
    gererErreur(err);
    bouton.disabled = false;
  }
});

$('#liste').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const f = FORMS[courant];
  const ligne = donnees[courant].find((d) => d.id == b.dataset.id);
  if (!ligne) return;

  if (b.dataset.act === 'mod') {
    edition = ligne;
    afficher();
    $('#formulaire').querySelector('input, select, textarea')?.focus();
  } else if (confirm(`Supprimer « ${f.titreItem(ligne)} » ?`)) {
    try {
      await api(`${f.url}/${ligne.id}`, { method: 'DELETE' });
      edition = null;
      await rafraichir();
      alerte('success', 'Suppression effectuée.');
    } catch (err) {
      gererErreur(err);
    }
  }
});

/* ---------- Démarrage ---------- */

(async function init() {
  const user = await chargerSession({ exiger: true });
  if (!user) return;
  onglets = ONGLETS_PAR_ROLE[user.role] || [];
  if (!onglets.length) return $('#vue-chargement').textContent = 'Votre rôle n’a pas accès aux formulaires.';
  courant = onglets[0];
  await chargerDonnees();
  $('#vue-chargement').classList.add('d-none');
  $('#vue-formulaires').classList.remove('d-none');
  afficher();
})();
