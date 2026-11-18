const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const PAGE_FORMULAIRES = 'formulaire.html';

const TAILLE_PAGE = { cartes: 9, tableau: 10 };
const ONGLETS = {
  medecins: { url: '/api/medecins', cartes: true,  type: 'medecins', nouveau: 'Nouveau médecin' },
  patients: { url: '/api/patients', cartes: true,  type: 'patients', nouveau: 'Nouveau patient' },
  rdv:      { url: '/api/rdv',      cartes: false, type: 'rdv',      nouveau: 'Nouveau rendez-vous' },
  dossiers: { url: '/api/dossiers', cartes: false, type: 'dossiers', nouveau: 'Nouveau dossier' },
};
const STATUTS = {
  planifie: { libelle: 'Planifié', classe: 'text-bg-primary' },
  termine:  { libelle: 'Terminé',  classe: 'text-bg-success' },
  annule:   { libelle: 'Annulé',   classe: 'text-bg-danger' },
};

let user = null;
let etat = { onglet: 'medecins', vue: 'cartes', page: 1 };
let jeton = 0;               // ignore les réponses périmées quand l'utilisateur tape vite
let actionConfirmee = null;
let minuterieAlerte = null;
let modalDetail, modalConfirmation;

/* ---------- Utilitaires ---------- */

const attr = (texte) => echapper(String(texte ?? '')).replace(/"/g, '&quot;');
const nombre = (n) => Number(n).toLocaleString('fr-FR');
const peut = (onglet, action) => window.POLITIQUE_ROLES[user.role]?.resources[ONGLETS[onglet].type]?.includes(action) || false;

function formaterDate(iso) {
  const [a, m, j] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, j).toLocaleDateString('fr-FR');
}

function initiales(prenom, nom) {
  return `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();
}

function avatar(prenom, nom, photo) {
  if (photo && /^https?:\/\//i.test(photo)) {
    return `<img class="avatar-initiales" src="${attr(photo)}" alt="Photo de ${attr(prenom)} ${attr(nom)}">`;
  }
  return `<div class="avatar-initiales" aria-hidden="true">${echapper(initiales(prenom, nom))}</div>`;
}

function afficherAlerte(message, type = 'success') {
  const alerte = $('#alerte-gestion');
  alerte.className = `alert alert-${type}`;
  alerte.textContent = message;
  clearTimeout(minuterieAlerte);
  if (type === 'success') minuterieAlerte = setTimeout(() => alerte.classList.add('d-none'), 5000);
}

function gererErreur(err) {
  if (err.status === 401) { window.location.href = 'auth.html'; return; }
  afficherAlerte(err.message || 'Une erreur est survenue.', 'danger');
}

function lienFormulaire(type, id) {
  if (!PAGE_FORMULAIRES) return '';
  const params = new URLSearchParams({ type });
  if (id) params.set('id', id);
  return `${PAGE_FORMULAIRES}?${params}`;
}

/* ---------- Boutons d'action ---------- */

function boutons(onglet, ligne, libelle) {
  const type = ONGLETS[onglet].type;
  const donnees = `data-id="${ligne.id}" data-onglet="${onglet}" data-label="${attr(libelle)}"`;
  let html = '';
  if (onglet !== 'rdv') html += `<button type="button" class="btn btn-sm btn-outline-secondary" data-action="voir" ${donnees}>Voir</button>`;
  if (onglet === 'dossiers' && ligne.fichier_present) {
    html += `<a class="btn btn-sm btn-outline-secondary" href="/api/dossiers/${ligne.id}/fichier" target="_blank" rel="noopener">Voir PDF</a>
      <a class="btn btn-sm btn-outline-secondary" href="/api/dossiers/${ligne.id}/fichier?telecharger=1">Télécharger</a>`;
  }
  if (onglet === 'rdv' && ligne.statut === 'planifie') {
    html += `<button type="button" class="btn btn-sm btn-outline-success" data-action="terminer" ${donnees}>Terminer</button>`;
    html += `<button type="button" class="btn btn-sm btn-outline-danger" data-action="annuler" ${donnees}>Annuler</button>`;
  }
  if (peut(onglet, 'update')) {
    html += `<a class="btn btn-sm btn-outline-secondary" href="${attr(lienFormulaire(type, ligne.id))}">Modifier</a>`;
  }
  if (peut(onglet, 'delete')) html += `<button type="button" class="btn btn-sm btn-outline-danger" data-action="supprimer" ${donnees}>Supprimer</button>`;
  return html;
}

/* ---------- Rendu : cartes ---------- */

function carteMedecin(m) {
  const nom = `Dr ${m.prenom} ${m.nom}`;
  return `
    <div class="col-md-6 col-xl-4"><div class="card carte-contenu h-100"><div class="card-body d-flex flex-column gap-3">
      <div class="d-flex gap-3 align-items-center">${avatar(m.prenom, m.nom, m.photo_url)}
        <div><div class="fw-semibold">${echapper(nom)}</div><div class="text-muted small">${echapper(m.specialite)}</div></div></div>
      <div><span class="badge ${m.disponible ? 'text-bg-success' : 'text-bg-danger'}">${m.disponible ? 'Disponible' : 'Indisponible'}</span>
        <span class="text-muted small ms-2">${nombre(m.rdv_a_venir)} rendez-vous à venir</span></div>
      <div class="small text-muted">${echapper([m.telephone, m.email].filter(Boolean).join(' · ') || 'Aucune coordonnée')}</div>
      <div class="d-flex flex-wrap gap-2 mt-auto">${boutons('medecins', m, nom)}</div>
    </div></div></div>`;
}

function cartePatient(p) {
  const nom = `${p.prenom} ${p.nom}`;
  return `
    <div class="col-md-6 col-xl-4"><div class="card carte-contenu h-100"><div class="card-body d-flex flex-column gap-3">
      <div class="d-flex gap-3 align-items-center">${avatar(p.prenom, p.nom)}
        <div><div class="fw-semibold">${echapper(nom)}</div>
          <div class="text-muted small">${nombre(p.age)} ans · ${p.sexe === 'F' ? 'Féminin' : 'Masculin'}</div></div></div>
      <div>${p.groupe_sanguin ? `<span class="badge text-bg-secondary me-1">${echapper(p.groupe_sanguin)}</span>` : ''}
        <span class="badge ${p.assure ? 'text-bg-success' : 'text-bg-warning'}">${p.assure ? 'Assuré' : 'Non assuré'}</span></div>
      <div class="small text-muted">${echapper([p.telephone, p.email].filter(Boolean).join(' · ') || 'Aucune coordonnée')}</div>
      <div class="d-flex flex-wrap gap-2 mt-auto">${boutons('patients', p, nom)}</div>
    </div></div></div>`;
}

/* ---------- Rendu : tableaux ---------- */

function tableau(entetes, lignes) {
  return `<div class="card carte-contenu"><div class="table-responsive"><table class="table table-hover table-gestion mb-0">
    <thead><tr>${entetes.map((e) => `<th>${e}</th>`).join('')}</tr></thead><tbody>${lignes}</tbody></table></div></div>`;
}

const ligneMedecin = (m) => `
  <tr><td>Dr ${echapper(m.prenom)} ${echapper(m.nom)}</td><td>${echapper(m.specialite)}</td>
    <td>${echapper(m.telephone || '–')}</td><td>${echapper(m.email || '–')}</td>
    <td><span class="badge ${m.disponible ? 'text-bg-success' : 'text-bg-danger'}">${m.disponible ? 'Disponible' : 'Indisponible'}</span></td>
    <td class="text-end"><div class="d-flex flex-wrap gap-2 justify-content-end">${boutons('medecins', m, `Dr ${m.prenom} ${m.nom}`)}</div></td></tr>`;

const lignePatient = (p) => `
  <tr><td>${echapper(p.prenom)} ${echapper(p.nom)}</td><td>${nombre(p.age)} ans</td><td>${p.sexe === 'F' ? 'F' : 'M'}</td>
    <td>${echapper(p.groupe_sanguin || '–')}</td><td>${echapper(p.telephone || '–')}</td>
    <td><span class="badge ${p.assure ? 'text-bg-success' : 'text-bg-warning'}">${p.assure ? 'Assuré' : 'Non assuré'}</span></td>
    <td class="text-end"><div class="d-flex flex-wrap gap-2 justify-content-end">${boutons('patients', p, `${p.prenom} ${p.nom}`)}</div></td></tr>`;

const ligneDossier = (d) => `
  <tr><td>${echapper(d.patient_prenom)} ${echapper(d.patient_nom)}</td>
    <td>${d.medecin_nom ? `Dr ${echapper(d.medecin_prenom)} ${echapper(d.medecin_nom)}` : '–'}</td>
    <td>${echapper(d.diagnostic.slice(0, 100))}${d.diagnostic.length > 100 ? '…' : ''}</td>
    <td>${formaterDate(d.updated_at)}</td>
    <td>${d.fichier_present ? 'PDF joint' : 'Aucun PDF'}</td>
    <td class="text-end"><div class="d-flex flex-wrap gap-2 justify-content-end">${boutons('dossiers', d, `Dossier de ${d.patient_prenom} ${d.patient_nom}`)}</div></td></tr>`;

const ligneRdv = (r) => {
  const s = STATUTS[r.statut];
  const libelle = `${r.patient_prenom} ${r.patient_nom}, ${formaterDate(r.date_rdv)} à ${r.heure_rdv}`;
  return `
    <tr><td class="text-nowrap">${formaterDate(r.date_rdv)}</td><td>${r.heure_rdv}</td>
      <td>${echapper(r.patient_prenom)} ${echapper(r.patient_nom)}</td>
      <td>Dr ${echapper(r.medecin_nom)}<div class="text-muted small">${echapper(r.specialite)}</div></td>
      <td>${echapper(r.motif)}</td><td><span class="badge ${s.classe}">${s.libelle}</span></td>
      <td class="text-end"><div class="d-flex flex-wrap gap-2 justify-content-end">${boutons('rdv', r, libelle)}</div></td></tr>`;
};

/* ---------- Affichage d'une page de résultats ---------- */

function afficher(d, vue) {
  const o = etat.onglet;
  $('#compteur').textContent = `${nombre(d.total)} résultat${d.total > 1 ? 's' : ''}`;

  if (!d.items.length) {
    $('#resultats').innerHTML = '<div class="card carte-contenu"><div class="card-body text-center text-muted py-5">Aucun résultat pour ces critères.</div></div>';
  } else if (vue === 'cartes') {
    const rendu = o === 'medecins' ? carteMedecin : cartePatient;
    $('#resultats').innerHTML = `<div class="row g-3">${d.items.map(rendu).join('')}</div>`;
  } else if (o === 'medecins') {
    $('#resultats').innerHTML = tableau(['Médecin', 'Spécialité', 'Téléphone', 'Email', 'Disponibilité', ''], d.items.map(ligneMedecin).join(''));
  } else if (o === 'patients') {
    $('#resultats').innerHTML = tableau(['Patient', 'Âge', 'Sexe', 'Groupe', 'Téléphone', 'Assurance', ''], d.items.map(lignePatient).join(''));
  } else if (o === 'dossiers') {
    $('#resultats').innerHTML = tableau(['Patient', 'Médecin', 'Diagnostic', 'Mis à jour', 'Pièce jointe', ''], d.items.map(ligneDossier).join(''));
  } else {
    $('#resultats').innerHTML = tableau(['Date', 'Heure', 'Patient', 'Médecin', 'Motif', 'Statut', ''], d.items.map(ligneRdv).join(''));
  }
  afficherPagination(d.page, d.pages);
}

function afficherPagination(page, pages) {
  if (pages <= 1) { $('#pagination').innerHTML = ''; return; }
  const debut = Math.max(1, Math.min(page - 2, pages - 4));
  const fin = Math.min(pages, debut + 4);
  const item = (p, texte, desactive = false, actif = false) =>
    `<li class="page-item${desactive ? ' disabled' : ''}${actif ? ' active' : ''}"><button type="button" class="page-link" data-page="${p}">${texte}</button></li>`;
  let html = item(page - 1, 'Précédent', page === 1);
  for (let p = debut; p <= fin; p++) html += item(p, p, false, p === page);
  html += item(page + 1, 'Suivant', page === pages);
  $('#pagination').innerHTML = html;
}

/* ---------- Chargement ---------- */

async function charger() {
  const cfg = ONGLETS[etat.onglet];
  const vue = cfg.cartes ? etat.vue : 'tableau';
  const params = new URLSearchParams({ page: etat.page, limite: TAILLE_PAGE[vue] });
  const q = $('#recherche').value.trim();
  if (q) params.set('q', q);
  $$(`[data-filtres="${etat.onglet}"] [name]`).forEach((el) => { if (el.value) params.set(el.name, el.value); });

  const monJeton = ++jeton;
  try {
    const d = await api(`${cfg.url}?${params}`);
    if (monJeton !== jeton) return;
    afficher(d, vue);
  } catch (err) {
    if (monJeton === jeton) gererErreur(err);
  }
}

/* ---------- Onglets, filtres, vue ---------- */

function reinitialiserFiltres() {
  $('#recherche').value = '';
  $$('[data-filtres] [name]').forEach((el) => { el.value = ''; });
}

function changerOnglet(nom, { garderFiltres = false } = {}) {
  etat.onglet = nom;
  etat.page = 1;
  if (!garderFiltres) reinitialiserFiltres();
  $$('#onglets [data-onglet]').forEach((b) => b.classList.toggle('active', b.dataset.onglet === nom));
  $$('[data-filtres]').forEach((g) => g.classList.toggle('d-none', g.dataset.filtres !== nom));
  $('#bascule-vue').classList.toggle('d-none', !ONGLETS[nom].cartes);
  history.replaceState(null, '', `#${nom}`);

  const bouton = $('#btn-nouveau');
  const lien = lienFormulaire(ONGLETS[nom].type);
  bouton.classList.toggle('d-none', !(lien && peut(nom, 'create')));
  bouton.textContent = ONGLETS[nom].nouveau;
  bouton.href = lien || '#';
  charger();
}

function changerVue(vue) {
  etat.vue = vue;
  etat.page = 1;
  $$('#bascule-vue [data-vue]').forEach((b) => {
    const actif = b.dataset.vue === vue;
    b.classList.toggle('btn-principal', actif);
    b.classList.toggle('btn-outline-secondary', !actif);
  });
  charger();
}

/* ---------- Détail et confirmations ---------- */

const ligneInfo = (titre, valeur) => `<dt class="col-sm-4">${titre}</dt><dd class="col-sm-8">${valeur}</dd>`;

function listeRdv(rdvs, vide) {
  if (!rdvs.length) return `<p class="text-muted">${vide}</p>`;
  return `<ul class="list-group">${rdvs.map((r) => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <span>${formaterDate(r.date_rdv)} à ${r.heure_rdv} · ${echapper(r.motif)}
        <span class="text-muted small">(${r.medecin_nom ? `Dr ${echapper(r.medecin_nom)}` : `${echapper(r.patient_prenom)} ${echapper(r.patient_nom)}`})</span></span>
      ${r.statut ? `<span class="badge ${STATUTS[r.statut].classe}">${STATUTS[r.statut].libelle}</span>` : ''}
    </li>`).join('')}</ul>`;
}

async function voirDetail(onglet, id) {
  try {
    const d = await api(`${ONGLETS[onglet].url}/${id}`);
    if (onglet === 'medecins') {
      const m = d.medecin;
      $('#titre-detail').textContent = `Dr ${m.prenom} ${m.nom}`;
      $('#corps-detail').innerHTML = `
        <dl class="row mb-3">
          ${ligneInfo('Spécialité', echapper(m.specialite))}
          ${ligneInfo('Disponibilité', m.disponible ? 'Disponible' : 'Indisponible')}
          ${ligneInfo('Téléphone', echapper(m.telephone || '–'))}
          ${ligneInfo('Email', echapper(m.email || '–'))}
          ${ligneInfo('Rendez-vous', `${nombre(m.planifies)} planifiés · ${nombre(m.termines)} terminés · ${nombre(m.annules)} annulés`)}
        </dl>
        <h3 class="h6">Prochains rendez-vous</h3>
        ${listeRdv(m.prochains_rdv.map((r) => ({ ...r, medecin_nom: null })), 'Aucun rendez-vous à venir.')}`;
    } else if (onglet === 'patients') {
      const p = d.patient;
      $('#titre-detail').textContent = `${p.prenom} ${p.nom}`;
      $('#corps-detail').innerHTML = `
        <dl class="row mb-3">
          ${ligneInfo('Naissance', `${formaterDate(p.date_naissance)} (${nombre(p.age)} ans)`)}
          ${ligneInfo('Sexe', p.sexe === 'F' ? 'Féminin' : 'Masculin')}
          ${ligneInfo('Groupe sanguin', echapper(p.groupe_sanguin || '–'))}
          ${ligneInfo('Téléphone', echapper(p.telephone || '–'))}
          ${ligneInfo('Email', echapper(p.email || '–'))}
          ${ligneInfo('Adresse', echapper(p.adresse || '–'))}
          ${ligneInfo('Allergies', echapper(p.allergies || 'Aucune connue'))}
          ${ligneInfo('Assurance', p.assure ? 'Assuré' : 'Non assuré')}
          ${ligneInfo('Dossiers', nombre(p.nb_dossiers))}
        </dl>
        <h3 class="h6">Derniers rendez-vous</h3>
        ${listeRdv(p.derniers_rdv, 'Aucun rendez-vous enregistré.')}`;
    } else {
      const dossier = d.dossier;
      $('#titre-detail').textContent = `Dossier médical · ${dossier.patient_prenom} ${dossier.patient_nom}`;
      const medecin = dossier.medecin_nom ? `Dr ${dossier.medecin_prenom} ${dossier.medecin_nom}` : 'Non précisé';
      const fichier = dossier.fichier_present
        ? `<p class="d-flex gap-3"><a href="/api/dossiers/${dossier.id}/fichier" target="_blank" rel="noopener">Consulter le PDF</a>
            <a href="/api/dossiers/${dossier.id}/fichier?telecharger=1">Télécharger le PDF</a></p>`
        : '<p class="text-muted">Aucun document PDF joint.</p>';
      $('#corps-detail').innerHTML = `
        <dl class="row mb-3">
          ${ligneInfo('Patient', `${echapper(dossier.patient_prenom)} ${echapper(dossier.patient_nom)}`)}
          ${ligneInfo('Médecin', echapper(medecin))}
          ${ligneInfo('Rendez-vous lié', dossier.rendez_vous_id ? nombre(dossier.rendez_vous_id) : 'Aucun')}
          ${ligneInfo('Créé le', formaterDate(dossier.created_at))}
          ${ligneInfo('Mis à jour le', formaterDate(dossier.updated_at))}
        </dl>
        <h3 class="h6">Diagnostic</h3><p class="text-break">${echapper(dossier.diagnostic)}</p>
        <h3 class="h6">Traitement</h3><p class="text-break">${echapper(dossier.traitement || 'Non renseigné')}</p>
        <h3 class="h6">Notes</h3><p class="text-break">${echapper(dossier.notes || 'Aucune')}</p>
        <h3 class="h6">Document joint</h3>${fichier}`;
    }
    modalDetail.show();
  } catch (err) {
    gererErreur(err);
  }
}

function confirmer({ titre, message, bouton, classe = 'btn-danger', action }) {
  $('#titre-confirmation').textContent = titre;
  $('#message-confirmation').textContent = message;
  const b = $('#btn-confirmer');
  b.textContent = bouton;
  b.className = `btn ${classe}`;
  actionConfirmee = action;
  modalConfirmation.show();
}

$('#btn-confirmer').addEventListener('click', async () => {
  const action = actionConfirmee;
  actionConfirmee = null;
  modalConfirmation.hide();
  if (!action) return;
  try {
    afficherAlerte(await action());
  } catch (err) {
    gererErreur(err);
  }
  charger();
});

function demanderAction(action, onglet, id, label) {
  if (action === 'voir') return voirDetail(onglet, id);

  if (action === 'supprimer') {
    const messages = {
      medecins: `Supprimer ${label} ? Cette action est définitive.`,
      patients: user.role === 'secretaire'
        ? `Supprimer ${label} ? La suppression est impossible si un dossier médical lui est rattaché.`
        : `Supprimer ${label} ? Ses rendez-vous et ses dossiers seront aussi supprimés. Cette action est définitive.`,
      rdv: `Supprimer le rendez-vous de ${label} ? Cette action est définitive.`,
      dossiers: `Supprimer ${label} ? Cette action est définitive.`,
    };
    return confirmer({
      titre: 'Confirmer la suppression', message: messages[onglet], bouton: 'Supprimer',
      action: async () => { await api(`${ONGLETS[onglet].url}/${id}`, { method: 'DELETE' }); return 'Suppression effectuée.'; },
    });
  }

  // terminer / annuler un rendez-vous
  const termine = action === 'terminer';
  confirmer({
    titre: termine ? 'Terminer le rendez-vous' : 'Annuler le rendez-vous',
    message: `${termine ? 'Marquer comme terminé' : 'Annuler'} le rendez-vous de ${label} ?`,
    bouton: termine ? 'Marquer terminé' : 'Annuler le rendez-vous',
    classe: termine ? 'btn-success' : 'btn-danger',
    action: async () => {
      await api(`/api/rdv/${id}/statut`, { method: 'PATCH', body: { statut: termine ? 'termine' : 'annule' } });
      return termine ? 'Rendez-vous marqué comme terminé.' : 'Rendez-vous annulé.';
    },
  });
}

/* ---------- Événements ---------- */

$('#resultats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (b) demanderAction(b.dataset.action, b.dataset.onglet, b.dataset.id, b.dataset.label);
});

$('#pagination').addEventListener('click', (e) => {
  const b = e.target.closest('[data-page]');
  if (!b || b.closest('.disabled')) return;
  etat.page = Number(b.dataset.page);
  charger();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

$('#onglets').addEventListener('click', (e) => {
  const b = e.target.closest('[data-onglet]');
  if (b && b.dataset.onglet !== etat.onglet) changerOnglet(b.dataset.onglet);
});

$('#bascule-vue').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vue]');
  if (b && b.dataset.vue !== etat.vue) changerVue(b.dataset.vue);
});

let delaiRecherche = null;
$('#recherche').addEventListener('input', () => {
  clearTimeout(delaiRecherche);
  delaiRecherche = setTimeout(() => { etat.page = 1; charger(); }, 300);
});

$$('[data-filtres]').forEach((groupe) => {
  groupe.addEventListener('change', () => { etat.page = 1; charger(); });
});

$('#btn-reinitialiser').addEventListener('click', () => {
  reinitialiserFiltres();
  etat.page = 1;
  charger();
});

/* ---------- Démarrage ---------- */

(async function init() {
  try {
    ({ user } = await api('/api/auth/moi'));
  } catch {
    window.location.href = 'auth.html';
    return;
  }
  monterNav('gestion', user);
  modalDetail = new bootstrap.Modal('#modal-detail');
  modalConfirmation = new bootstrap.Modal('#modal-confirmation');
  const ressources = window.POLITIQUE_ROLES[user.role]?.resources || {};
  $$('#onglets [data-onglet]').forEach((b) => {
    b.closest('.nav-item').classList.toggle('d-none', !ressources[ONGLETS[b.dataset.onglet].type]?.includes('read'));
  });

  try {
    const f = await api('/api/medecins/filtres');
    $('#f-specialite').insertAdjacentHTML('beforeend', f.specialites.map((s) => `<option value="${attr(s)}">${echapper(s)}</option>`).join(''));
    $('#f-medecin').insertAdjacentHTML('beforeend', f.medecins.map((m) => `<option value="${m.id}">Dr ${echapper(m.nom)}</option>`).join(''));
  } catch (err) {
    gererErreur(err);
  }
  if (user.role === 'medecin') $('#f-medecin').closest('.col-6').classList.add('d-none');

  $('#vue-chargement').classList.add('d-none');
  $('#vue-gestion').classList.remove('d-none');
  const depart = location.hash.slice(1);
  const premierAutorise = Object.keys(ONGLETS).find((onglet) => ressources[ONGLETS[onglet].type]?.includes('read'));
  changerOnglet(ONGLETS[depart] && ressources[ONGLETS[depart].type]?.includes('read') ? depart : premierAutorise);
})();