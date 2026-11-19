// Tout ce qui concerne le jeton de connexion (JWT) et le cookie qui le transporte.
// Le JWT contient l'id et le rôle de l'utilisateur, signé avec JWT_SECRET
// pour qu'on ne puisse pas le modifier sans que le serveur le voie.

import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'token';
const DUREE_HEURES = 8; // la session dure 8 h

// récupère la clé secrète, et plante tout de suite si elle n'est pas configurée
function secret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET manquante dans les variables d\'environnement');
  }
  return process.env.JWT_SECRET;
}

// Crée le jeton après une connexion ou une inscription réussie
export function signerToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom },
    secret(),
    { expiresIn: `${DUREE_HEURES}h` }
  );
}

// Met le jeton dans un cookie.
// httpOnly : le JavaScript de la page ne peut pas le lire (protège contre le vol par XSS)
// secure : envoyé seulement en https quand on est en production
export function poserCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DUREE_HEURES * 3600 * 1000,
  });
}

// Supprime le cookie (déconnexion)
export function effacerCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Vérifie que l'utilisateur est connecté et place ses infos dans req.user
// À mettre devant chaque route protégée. Pas de jeton ou jeton invalide = erreur 401.
export function exigerConnexion(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ erreur: 'Non authentifié' });
  try {
    req.user = jwt.verify(token, secret());
    next();
  } catch {
    res.status(401).json({ erreur: 'Session expirée ou invalide' });
  }
}
