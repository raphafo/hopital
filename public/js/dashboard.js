const $ = (selector) => document.querySelector(selector);
const LIBELLES_ACTIONS = {
  connexion: 'Connexion',
  creation: 'Création',
  modification: 'Modification',
  suppression: 'Suppression',
};
const CLASSES_ACTIONS = {
  connexion: 'status-pl',
  creation: 'status-ok',
  modification: 'status-pl',
  suppression: 'status-ko',
};
const FORMAT_MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
let activites = [];

function echapperHtml(value) {
  const element = document.createElement('span');
  element.textContent = value ?? '';
  return element.innerHTML;
}

function afficherConsultations(rows) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row.nombre)));
  $('#hd-monthly-chart').innerHTML = rows.map((row) => {
    const date = new Date(`${String(row.mois).slice(0, 10)}T12:00:00`);
    const nombre = Number(row.nombre);
    const hauteur = Math.max(4, Math.round(nombre / maximum * 150));
    return `<div class="chart-item" title="${nombre} consultation(s)">
      <span class="chart-count">${nombre}</span>
      <div class="chart-bar" style="height:${hauteur}px"></div>
      <div class="chart-label">${FORMAT_MOIS.format(date)}</div>
    </div>`;
  }).join('');
}

function afficherSpecialites(rows) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row.nombre)));
  $('#hd-specialties').innerHTML = rows.length ? rows.map((row) => {
    const nombre = Number(row.nombre);
    const pourcentage = Math.round(nombre / maximum * 100);
    const nom = echapperHtml(row.specialite);
    return `<div class="specialty-row">
      <div class="d-flex justify-content-between">
        <span class="specialty-name">${nom}</span>
        <strong class="specialty-number">${nombre}</strong>
      </div>
      <div class="progress" role="progressbar" aria-label="${nom}" aria-valuenow="${pourcentage}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" style="width:${pourcentage}%"></div>
      </div>
    </div>`;
  }).join('') : '<p class="text-muted mb-0">Aucune donnée disponible.</p>';
}

function afficherActivites() {
  const filtre = $('#filtre-activites').value;
  const liste = filtre ? activites.filter((item) => item.action === filtre) : activites;
  $('#hd-activity-body').innerHTML = liste.length ? liste.map((item) => `
    <tr>
      <td>${echapperHtml(item.description)}</td>
      <td class="text-nowrap">${FORMAT_DATE.format(new Date(item.created_at))}</td>
      <td><span class="status-tag ${CLASSES_ACTIONS[item.action] || 'status-pl'}">${LIBELLES_ACTIONS[item.action] || 'Action'}</span></td>
    </tr>`).join('') : '<tr><td colspan="3" class="text-muted">Aucune activité pour ce filtre.</td></tr>';
}

function afficherStatuts(rows) {
  const libelles = { planifie: 'Planifié', termine: 'Terminé', annule: 'Annulé' };
  const classes = { planifie: 'status-pl', termine: 'status-ok', annule: 'status-ko' };
  const nombres = new Map(rows.map((item) => [item.statut, Number(item.nombre)]));
  $('#hd-status-body').innerHTML = Object.keys(libelles).map((statut) => `
    <tr>
      <td><span class="status-tag ${classes[statut]}">${libelles[statut]}</span></td>
      <td>${nombres.get(statut) || 0}</td>
    </tr>`).join('');
}

async function chargerDashboard() {
  const user = await chargerSession({ exiger: true });
  if (!user) return;

  try {
    const data = await api('/api/dashboard');
    $('#stat-patients').textContent = data.statistiques.patients;
    $('#stat-medecins').textContent = data.statistiques.medecins;
    $('#stat-rdv-avenir').textContent = data.statistiques.rendez_vous_a_venir;
    $('#stat-annulations').textContent = `${data.statistiques.taux_annulation} %`;
    activites = data.activites;
    afficherConsultations(data.consultationsParMois);
    afficherSpecialites(data.rendezVousParSpecialite);
    afficherActivites();
    afficherStatuts(data.rendezVousParStatut);
    $('#date-actualisation').textContent = `Mis à jour à ${new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date())}`;
    $('#contenu-dashboard').classList.remove('d-none');
  } catch (err) {
    $('#alerte-dashboard').textContent = err.message;
    $('#alerte-dashboard').classList.remove('d-none');
  } finally {
    $('#chargement-dashboard').classList.add('d-none');
  }
}

$('#filtre-activites').addEventListener('change', afficherActivites);
chargerDashboard();
