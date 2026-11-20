// Script de la page auth.html : connexion, inscription, profil
// et, pour l'admin, la liste des utilisateurs (changer le rôle, activer/désactiver).

const LIBELLES_ROLES = { admin: 'Administrateur', medecin: 'Médecin', secretaire: 'Secrétaire' };
const RE_NOM = /^[\p{L}][\p{L} '\-]{1,79}$/u;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// raccourci : $('#id') au lieu de document.querySelector('#id')
const $ = (sel) => document.querySelector(sel);
let utilisateurCourant = null; // l'utilisateur connecté, null si personne

/* ---------- Affichage des vues ---------- */

// la page a 3 blocs (chargement, visiteur, connecté) : on n'en montre qu'un
function afficherVue(nom) {
  $('#vue-chargement').classList.toggle('d-none', nom !== 'chargement');
  $('#vue-anonyme').classList.toggle('d-none', nom !== 'anonyme');
  $('#vue-connecte').classList.toggle('d-none', nom !== 'connecte');
}

// affiche le profil de l'utilisateur connecté, et la gestion des comptes si c'est un admin
function afficherConnecte(user) {
  utilisateurCourant = user;
  monterNav('users', user);
  $('#nom-utilisateur').textContent = `${user.prenom} ${user.nom}`;
  $('#role-utilisateur').textContent = LIBELLES_ROLES[user.role] || user.role;
  $('#email-utilisateur').textContent = user.email;
  afficherVue('connecte');

  const estAdmin = user.role === 'admin';
  $('#section-admin').classList.toggle('d-none', !estAdmin);
  if (estAdmin) chargerUtilisateurs();
}

// médecin et secrétaire n'ont rien à faire sur cette page une fois connectés :
// on les envoie sur les formulaires. Renvoie true si on a redirigé.
function redirigerVersFormulaires(user) {
  if (!['medecin', 'secretaire'].includes(user.role)) return false;
  location.href = 'formulaire.html';
  return true;
}

/* ---------- Validation et erreurs de formulaire ---------- */

// enlève le rouge des champs en erreur
function effacerErreurs(form) {
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
}

// champs = { nomDuChamp: 'message' } : met le champ en rouge (is-invalid de Bootstrap),
// écrit le message en dessous et place le curseur sur la première erreur
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

// affiche un message dans un bandeau Bootstrap (rouge par défaut, vert avec 'success')
function afficherAlerte(id, message, type = 'danger') {
  const alerte = $(id);
  alerte.className = `alert alert-${type}`;
  alerte.textContent = message;
}

function masquerAlerte(id) {
  $(id).classList.add('d-none');
}

// Vérifications dans le navigateur avant d'envoyer, pour répondre tout de suite.
// Le serveur refait les mêmes contrôles (middleware/validate.js).
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

// envoi du formulaire de connexion : vérif, appel à l'API, puis redirection selon le rôle
// (admin vers le tableau de bord, médecin et secrétaire vers les formulaires)
$('#form-connexion').addEventListener('submit', async (e) => {
  e.preventDefault(); // empêche le rechargement de la page
  const form = e.target;
  effacerErreurs(form);
  masquerAlerte('#alerte-connexion');

  const champs = validerConnexion(form);
  if (Object.keys(champs).length) return afficherErreursChamps(form, champs);

  // bouton désactivé pendant l'envoi pour éviter les doubles clics
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

// envoi du formulaire d'inscription (le nouveau compte est secrétaire, donc redirigé vers les formulaires)
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

// bouton Afficher / Masquer : passe les champs mot de passe en texte et inversement
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
  monterNav('connexion', null);
  afficherVue('anonyme');
});

/* ---------- Gestion des utilisateurs (admin) ---------- */

// echapper() est fournie par nav.js
// remplit le tableau des comptes : une liste pour le rôle et un interrupteur actif/inactif.
// L'admin ne peut pas modifier sa propre ligne (champs désactivés).
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

// Un seul écouteur sur tout le tableau (délégation d'événement) :
// quand un rôle ou un interrupteur change, on envoie la modif à l'API.
// data-id et data-champ disent quel compte et quel champ ont changé.
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

// au chargement : déjà connecté, on affiche le profil ; sinon le formulaire de connexion
(async function init() {
  try {
    const { user } = await api('/api/auth/moi');
    if (redirigerVersFormulaires(user)) return;
    afficherConnecte(user);
  } catch {
    monterNav('connexion', null);
    afficherVue('anonyme');
  }
})();
