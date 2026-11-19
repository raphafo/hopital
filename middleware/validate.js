// Validation côté serveur : on ne fait jamais confiance au navigateur.
// (même si la page vérifie déjà, quelqu'un peut envoyer une requête à la main)

// nom/prénom : commence par une lettre, puis lettres, espaces, ' ou -, 2 à 80 caractères
const RE_NOM = /^[\p{L}][\p{L} '\-]{1,79}$/u;
// email simple : quelquechose@domaine.extension
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// renvoie le texte sans espaces autour, ou '' si ce n'est pas du texte
const texte = (v) => (typeof v === 'string' ? v.trim() : '');

// Vérifie le formulaire d'inscription.
// Renvoie les valeurs nettoyées + champs = { nomDuChamp: 'message d'erreur' }.
// Si champs est vide, tout est bon.
export function validerInscription(body = {}) {
  const valeurs = {
    nom: texte(body.nom),
    prenom: texte(body.prenom),
    email: texte(body.email).toLowerCase(),
    mot_de_passe: typeof body.mot_de_passe === 'string' ? body.mot_de_passe : '',
  };
  const confirmation = typeof body.confirmation === 'string' ? body.confirmation : '';
  const champs = {};

  if (!RE_NOM.test(valeurs.nom)) champs.nom = 'Nom invalide (2 à 80 lettres, espaces, tirets ou apostrophes).';
  if (!RE_NOM.test(valeurs.prenom)) champs.prenom = 'Prénom invalide (2 à 80 lettres, espaces, tirets ou apostrophes).';
  if (!RE_EMAIL.test(valeurs.email) || valeurs.email.length > 150) champs.email = 'Adresse email invalide.';

  // mot de passe : 8 caractères mini, 72 octets maxi (limite de bcrypt), au moins une lettre et un chiffre
  const mdp = valeurs.mot_de_passe;
  if (mdp.length < 8) champs.mot_de_passe = 'Le mot de passe doit contenir au moins 8 caractères.';
  else if (Buffer.byteLength(mdp) > 72) champs.mot_de_passe = 'Le mot de passe est trop long (72 caractères maximum).';
  else if (!/[A-Za-z]/.test(mdp) || !/\d/.test(mdp)) champs.mot_de_passe = 'Le mot de passe doit contenir au moins une lettre et un chiffre.';

  if (!champs.mot_de_passe && mdp !== confirmation) champs.confirmation = 'Les mots de passe ne correspondent pas.';

  return { valeurs, champs };
}

// Vérifie le formulaire de connexion (même format de retour)
export function validerConnexion(body = {}) {
  const valeurs = {
    email: texte(body.email).toLowerCase(),
    mot_de_passe: typeof body.mot_de_passe === 'string' ? body.mot_de_passe : '',
  };
  const champs = {};
  if (!RE_EMAIL.test(valeurs.email)) champs.email = 'Adresse email invalide.';
  if (!valeurs.mot_de_passe) champs.mot_de_passe = 'Le mot de passe est obligatoire.';
  return { valeurs, champs };
}

// les 3 rôles possibles dans l'application
export const ROLES = ['admin', 'medecin', 'secretaire'];
