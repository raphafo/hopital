const LIBELLES_ROLES = { admin: 'Administrateur', medecin: 'Médecin', secretaire: 'Secrétaire' };
const RE_NOM = /^[\p{L}][\p{L} '\-]{1,79}$/u;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const $ = (sel) => document.querySelector(sel);
let utilisateurCourant = null;

/* ---------- Affichage des vues ---------- */

function afficherVue(nom) {
  $('#vue-chargement').classList.toggle('d-none', nom !== 'chargement');
  $('#vue-anonyme').classList.toggle('d-none', nom !== 'anonyme');
  $('#vue-connecte').classList.toggle('d-none', nom !== 'connecte');
}

function afficherConnecte(user) {
  utilisateurCourant = user;
  $('#nom-utilisateur').textContent = `${user.prenom} ${user.nom}`;
  $('#role-utilisateur').textContent = LIBELLES_ROLES[user.role] || user.role;
  $('#email-utilisateur').textContent = user.email;
  afficherVue('connecte');

  const estAdmin = user.role === 'admin';
  $('#section-admin').classList.toggle('d-none', !estAdmin);
  if (estAdmin) chargerUtilisateurs();
}

function redirigerVersFormulaires(user) {
  if (!['medecin', 'secretaire'].includes(user.role)) return false;
  location.href = 'formulaire.html';
  return true;
}

/* ---------- Validation et erreurs de formulaire ---------- */

function effacerErreurs(form) {
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
}

function afficherErreursChamps(form, champs) {
  for (const [nom, message] of Object.entries(champs)) {
    const input = form.elements[nom];
    if (!input) continue;
    input.classList.add('is-invalid');
    const retour = input.closest('.col-12, .col-md-6, .mb-3, .mb-4, .form-check')?.querySelector('.invalid-feedback');
    if (retour) retour.textContent = message;
  }
  const premier = form.querySelector('.is-invalid');
  if (premier) premier.focus();
}

function afficherAlerte(id, message, type = 'danger') {
  const alerte = $(id);
  alerte.className = `alert alert-${type}`;
  alerte.textContent = message;
}

function masquerAlerte(id) {
  $(id).classList.add('d-none');
}

function validerConnexion(f) {
  const champs = {};
  if (!RE_EMAIL.test(f.email.value.trim())) champs.email = 'Adresse email invalide.';
  if (!f.mot_de_passe.value) champs.mot_de_passe = 'Le mot de passe est obligatoire.';
  return champs;
}

function validerInscription(f) {
  const champs = {};
  if (!RE_NOM.test(f.prenom.value.trim())) champs.prenom = 'Prénom invalide (2 à 80 lettres, espaces, tirets ou apostrophes).';
  if (!RE_NOM.test(f.nom.value.trim())) champs.nom = 'Nom invalide (2 à 80 lettres, espaces, tirets ou apostrophes).';
  if (!RE_EMAIL.test(f.email.value.trim())) champs.email = 'Adresse email invalide.';

  const mdp = f.mot_de_passe.value;
  if (mdp.length < 8) champs.mot_de_passe = 'Le mot de passe doit contenir au moins 8 caractères.';
  else if (!/[A-Za-z]/.test(mdp) || !/\d/.test(mdp)) champs.mot_de_passe = 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  else if (mdp !== f.confirmation.value) champs.confirmation = 'Les mots de passe ne correspondent pas.';

  if (!f.conditions.checked) champs.conditions = "Vous devez accepter les conditions d'utilisation.";
  return champs;
}

/* ---------- Connexion ---------- */

$('#form-connexion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  effacerErreurs(form);
  masquerAlerte('#alerte-connexion');

  const champs = validerConnexion(form);
  if (Object.keys(champs).length) return afficherErreursChamps(form, champs);

  const bouton = $('#btn-connexion');
  bouton.disabled = true;
  try {
    const { user } = await api('/api/auth/login', {
      method: 'POST',
      body: { email: form.email.value, mot_de_passe: form.mot_de_passe.value },
    });
    form.reset();
    if (user.role === 'admin') {
      location.href = 'dashboard.html';
      return;
    }
    if (redirigerVersFormulaires(user)) return;
    afficherConnecte(user);
  } catch (err) {
    if (Object.keys(err.champs || {}).length) afficherErreursChamps(form, err.champs);
    else afficherAlerte('#alerte-connexion', err.message);
  } finally {
    bouton.disabled = false;
  }
});

/* ---------- Inscription ---------- */

$('#form-inscription').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  effacerErreurs(form);
  masquerAlerte('#alerte-inscription');

  const champs = validerInscription(form);
  if (Object.keys(champs).length) return afficherErreursChamps(form, champs);

  const bouton = $('#btn-inscription');
  bouton.disabled = true;
  try {
    const { user } = await api('/api/auth/register', {
      method: 'POST',
      body: {
        prenom: form.prenom.value,
        nom: form.nom.value,
        email: form.email.value,
        mot_de_passe: form.mot_de_passe.value,
        confirmation: form.confirmation.value,
      },
    });
    form.reset();
    if (redirigerVersFormulaires(user)) return;
    afficherConnecte(user);
  } catch (err) {
    if (Object.keys(err.champs || {}).length) afficherErreursChamps(form, err.champs);
    else afficherAlerte('#alerte-inscription', err.message);
  } finally {
    bouton.disabled = false;
  }
});

// Effacer l'erreur d'un champ dès que l'utilisateur le modifie
document.querySelectorAll('form').forEach((form) => {
  form.addEventListener('input', (e) => e.target.classList.remove('is-invalid'));
});

$('#btn-voir-mdp').addEventListener('click', (e) => {
  const champs = [$('#inscription-mdp'), $('#inscription-confirmation')];
  const afficher = champs[0].type === 'password';
  champs.forEach((c) => { c.type = afficher ? 'text' : 'password'; });
  e.target.textContent = afficher ? 'Masquer' : 'Afficher';
});

/* ---------- Déconnexion ---------- */

$('#btn-deconnexion').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* on se déconnecte quand même côté page */ }
  utilisateurCourant = null;
  afficherVue('anonyme');
});

/* ---------- Gestion des utilisateurs (admin) ---------- */

function echapper(texte) {
  const d = document.createElement('div');
  d.textContent = texte;
  return d.innerHTML;
}

async function chargerUtilisateurs() {
  const corps = $('#corps-utilisateurs');
  try {
    const { users } = await api('/api/users');
    corps.innerHTML = users.map((u) => {
      const moi = u.id === utilisateurCourant.id;
      const options = Object.entries(LIBELLES_ROLES)
        .map(([valeur, libelle]) => `<option value="${valeur}" ${u.role === valeur ? 'selected' : ''}>${libelle}</option>`)
        .join('');
      return `
        <tr>
          <td>${echapper(u.prenom)} ${echapper(u.nom)}${moi ? ' <span class="badge text-bg-light">vous</span>' : ''}</td>
          <td>${echapper(u.email)}</td>
          <td>
            <select class="form-select form-select-sm" data-id="${u.id}" data-champ="role" ${moi ? 'disabled' : ''}
                    aria-label="Rôle de ${echapper(u.prenom)} ${echapper(u.nom)}">${options}</select>
          </td>
          <td class="text-center">
            <div class="form-check form-switch d-inline-block">
              <input class="form-check-input" type="checkbox" data-id="${u.id}" data-champ="actif"
                     ${u.actif ? 'checked' : ''} ${moi ? 'disabled' : ''}
                     aria-label="Compte actif pour ${echapper(u.prenom)} ${echapper(u.nom)}">
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    afficherAlerte('#alerte-admin', err.message);
  }
}

$('#corps-utilisateurs').addEventListener('change', async (e) => {
  const el = e.target;
  const id = el.dataset.id;
  if (!id) return;

  const modification = el.dataset.champ === 'role' ? { role: el.value } : { actif: el.checked };
  masquerAlerte('#alerte-admin');
  try {
    await api(`/api/users/${id}`, { method: 'PATCH', body: modification });
    afficherAlerte('#alerte-admin', 'Modification enregistrée.', 'success');
  } catch (err) {
    afficherAlerte('#alerte-admin', err.message);
    chargerUtilisateurs(); // remet l'affichage dans l'état réel de la base
  }
});

/* ---------- Démarrage ---------- */

(async function init() {
  try {
    const { user } = await api('/api/auth/moi');
    if (redirigerVersFormulaires(user)) return;
    afficherConnecte(user);
  } catch {
    afficherVue('anonyme');
  }
})();
