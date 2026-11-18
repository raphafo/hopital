const $ = (sel) => document.querySelector(sel);
const INTERVALLE_MS = 30000;
const COULEUR = '#0f766e';

const STATUTS = {
  planifie: { libelle: 'Planifié', classe: 'text-bg-primary' },
  termine:  { libelle: 'Terminé',  classe: 'text-bg-success' },
  annule:   { libelle: 'Annulé',   classe: 'text-bg-danger' },
};
const ACTIONS = {
  connexion:    { libelle: 'Connexion',    classe: 'text-bg-primary' },
  creation:     { libelle: 'Création',     classe: 'text-bg-success' },
  modification: { libelle: 'Modification', classe: 'text-bg-warning' },
  suppression:  { libelle: 'Suppression',  classe: 'text-bg-danger' },
};

let graphMois = null;
let graphSpecialite = null;
let minuteur = null;

/* ---------- Utilitaires d'affichage ---------- */

const nombre = (n) => Number(n).toLocaleString('fr-FR');

function nomMois(aaaaMm) {
  const [annee, mois] = aaaaMm.split('-').map(Number);
  return new Date(annee, mois - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

function ilYa(dateIso) {
  const secondes = Math.round((new Date(dateIso) - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  const abs = Math.abs(secondes);
  if (abs < 60) return rtf.format(Math.round(secondes), 'second');
  if (abs < 3600) return rtf.format(Math.round(secondes / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(secondes / 3600), 'hour');
  return rtf.format(Math.round(secondes / 86400), 'day');
}

function afficherErreur(message) {
  const alerte = $('#alerte-dash');
  alerte.textContent = message;
  alerte.classList.remove('d-none');
}

/* ---------- Rendu des blocs ---------- */

function majKpi(k) {
  $('#kpi-patients').textContent = nombre(k.patients);
  $('#kpi-medecins').textContent = nombre(k.medecins);
  $('#kpi-avenir').textContent = nombre(k.rdv_a_venir);
  $('#kpi-aujourdhui').textContent = nombre(k.rdv_aujourdhui);
  $('#kpi-annulation').textContent = `${k.taux_annulation.toLocaleString('fr-FR')} %`;
  $('#kpi-total').textContent = nombre(k.rdv_total);
}

function optionsCommunes(extra = {}) {
  return { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, ...extra };
}

function majGraphiques(d) {
  const labelsMois = d.consultations_par_mois.map((m) => nomMois(m.mois));
  const valeursMois = d.consultations_par_mois.map((m) => m.nb);
  const labelsSpec = d.par_specialite.map((s) => s.specialite);
  const valeursSpec = d.par_specialite.map((s) => s.nb);

  if (!graphMois) {
    graphMois = new Chart($('#graph-mois'), {
      type: 'bar',
      data: { labels: labelsMois, datasets: [{ label: 'Consultations terminées', data: valeursMois, backgroundColor: COULEUR, borderRadius: 6 }] },
      options: optionsCommunes({ scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }),
    });
    graphSpecialite = new Chart($('#graph-specialite'), {
      type: 'bar',
      data: { labels: labelsSpec, datasets: [{ label: 'Rendez-vous', data: valeursSpec, backgroundColor: COULEUR, borderRadius: 6 }] },
      options: optionsCommunes({ indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }),
    });
  } else {
    graphMois.data.labels = labelsMois;
    graphMois.data.datasets[0].data = valeursMois;
    graphMois.update();
    graphSpecialite.data.labels = labelsSpec;
    graphSpecialite.data.datasets[0].data = valeursSpec;
    graphSpecialite.update();
  }
}

function majStatuts(lignes) {
  $('#corps-statuts').innerHTML = lignes.map((l) => {
    const s = STATUTS[l.statut] || { libelle: l.statut, classe: 'text-bg-secondary' };
    return `<tr><td><span class="badge ${s.classe}">${s.libelle}</span></td><td class="text-end fw-semibold">${nombre(l.nb)}</td></tr>`;
  }).join('');
}

function majMedecins(lignes) {
  $('#corps-medecins').innerHTML = lignes.length
    ? lignes.map((m) => `
        <tr>
          <td>Dr ${echapper(m.prenom)} ${echapper(m.nom)}</td>
          <td>${echapper(m.specialite)}</td>
          <td class="text-end">${nombre(m.planifies)}</td>
          <td class="text-end">${nombre(m.termines)}</td>
          <td class="text-end">${nombre(m.annules)}</td>
          <td class="text-end fw-semibold">${nombre(m.total)}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="text-center text-muted py-3">Aucun médecin enregistré.</td></tr>';
}

function majActivites(lignes) {
  $('#corps-activites').innerHTML = lignes.length
    ? lignes.map((a) => {
        const act = ACTIONS[a.action] || { libelle: a.action, classe: 'text-bg-secondary' };
        const par = a.user_prenom ? `${echapper(a.user_prenom)} ${echapper(a.user_nom)}` : '<span class="text-muted">Système</span>';
        const complet = new Date(a.created_at).toLocaleString('fr-FR');
        return `
          <tr>
            <td>${echapper(a.description)}</td>
            <td>${par}</td>
            <td><span class="badge ${act.classe}">${act.libelle}</span></td>
            <td class="text-nowrap" title="${complet}">${ilYa(a.created_at)}</td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="4" class="text-center text-muted py-3">Aucune activité ne correspond.</td></tr>';
}

/* ---------- Chargement des données ---------- */

function gererErreur(err) {
  if (err.status === 401) { window.location.href = 'auth.html'; return; }
  if (err.status === 403) { arreterActualisation(); afficherVue('refuse'); return; }
  afficherErreur(err.message || "Impossible d'actualiser les données.");
}

async function chargerActivites() {
  const params = new URLSearchParams();
  if ($('#filtre-action').value) params.set('action', $('#filtre-action').value);
  if ($('#filtre-recherche').value.trim()) params.set('q', $('#filtre-recherche').value.trim());
  const { activites } = await api(`/api/stats/activites?${params}`);
  majActivites(activites);
}

async function actualiser() {
  try {
    const d = await api('/api/stats/dashboard');
    majKpi(d.kpi);
    majGraphiques(d);
    majStatuts(d.par_statut);
    majMedecins(d.par_medecin);
    await chargerActivites();
    $('#alerte-dash').classList.add('d-none');
    $('#maj-heure').textContent = new Date().toLocaleTimeString('fr-FR');
  } catch (err) {
    gererErreur(err);
  }
}

function demarrerActualisation() {
  arreterActualisation();
  minuteur = setInterval(() => { if (!document.hidden) actualiser(); }, INTERVALLE_MS);
}

function arreterActualisation() {
  if (minuteur) clearInterval(minuteur);
  minuteur = null;
}

/* ---------- Démarrage ---------- */

function afficherVue(nom) {
  $('#vue-chargement').classList.toggle('d-none', nom !== 'chargement');
  $('#acces-refuse').classList.toggle('d-none', nom !== 'refuse');
  $('#vue-dashboard').classList.toggle('d-none', nom !== 'dashboard');
}

let delaiRecherche = null;
$('#filtre-action').addEventListener('change', () => chargerActivites().catch(gererErreur));
$('#filtre-recherche').addEventListener('input', () => {
  clearTimeout(delaiRecherche);
  delaiRecherche = setTimeout(() => chargerActivites().catch(gererErreur), 300);
});
$('#btn-actualiser').addEventListener('click', actualiser);

(async function init() {
  let user;
  try {
    ({ user } = await api('/api/auth/moi'));
  } catch {
    window.location.href = 'auth.html';
    return;
  }
  monterNav('dashboard', user);
  if (user.role !== 'admin') return afficherVue('refuse');

  afficherVue('dashboard');
  await actualiser();
  demarrerActualisation();
})();