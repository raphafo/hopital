import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'token';
const DUREE_HEURES = 8;

function secret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET manquante dans les variables d\'environnement');
  }
  return process.env.JWT_SECRET;
}

export function signerToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom },
    secret(),
    { expiresIn: `${DUREE_HEURES}h` }
  );
}

export function poserCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DUREE_HEURES * 3600 * 1000,
  });
}

export function effacerCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Vérifie que l'utilisateur est connecté et place ses infos dans req.user
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
