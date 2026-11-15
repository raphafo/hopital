import bcrypt from 'bcryptjs';
import * as Users from '../models/userModel.js';
import { enregistrerActivite } from '../models/activiteModel.js';
import { signerToken, poserCookie, effacerCookie } from '../middleware/auth.js';
import { validerInscription, validerConnexion } from '../middleware/validate.js';

// Sert à comparer un mot de passe même quand l'email n'existe pas :
// le temps de réponse ne révèle alors pas si le compte existe.
const HASH_FACTICE = bcrypt.hashSync('mot-de-passe-factice', 10);

const publique = (u) => ({ id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role });

export async function inscription(req, res, next) {
  try {
    const { valeurs, champs } = validerInscription(req.body);
    if (Object.keys(champs).length) {
      return res.status(400).json({ erreur: 'Données invalides', champs });
    }
    if (await Users.trouverParEmail(valeurs.email)) {
      return res.status(409).json({ erreur: 'Données invalides', champs: { email: 'Cet email est déjà utilisé.' } });
    }

    const hash = await bcrypt.hash(valeurs.mot_de_passe, 10);
    // Le rôle n'est jamais lu dans la requête : tout nouveau compte est « secretaire ».
    const user = await Users.creer({ nom: valeurs.nom, prenom: valeurs.prenom, email: valeurs.email, hash });

    await enregistrerActivite({
      userId: user.id, action: 'creation', entite: 'user', entiteId: user.id,
      description: `Nouveau compte créé : ${user.prenom} ${user.nom}`,
    });

    poserCookie(res, signerToken(user));
    res.status(201).json({ user: publique(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erreur: 'Données invalides', champs: { email: 'Cet email est déjà utilisé.' } });
    }
    next(err);
  }
}

export async function connexion(req, res, next) {
  try {
    const { valeurs, champs } = validerConnexion(req.body);
    if (Object.keys(champs).length) {
      return res.status(400).json({ erreur: 'Données invalides', champs });
    }

    const user = await Users.trouverParEmail(valeurs.email);
    const motDePasseOk = await bcrypt.compare(valeurs.mot_de_passe, user?.mot_de_passe_hash ?? HASH_FACTICE);

    if (!user || !motDePasseOk) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
    }
    if (!user.actif) {
      return res.status(403).json({ erreur: 'Ce compte est désactivé. Contactez un administrateur.' });
    }

    await enregistrerActivite({
      userId: user.id, action: 'connexion', entite: 'user', entiteId: user.id,
      description: `Connexion de ${user.prenom} ${user.nom}`,
    });

    poserCookie(res, signerToken(user));
    res.json({ user: publique(user) });
  } catch (err) {
    next(err);
  }
}

export function deconnexion(req, res) {
  effacerCookie(res);
  res.json({ message: 'Déconnecté' });
}

// Renvoie l'utilisateur connecté, relu en base (le rôle ou l'état du compte ont pu changer).
export async function moi(req, res, next) {
  try {
    const user = await Users.trouverParId(req.user.id);
    if (!user || !user.actif) {
      effacerCookie(res);
      return res.status(401).json({ erreur: 'Compte introuvable ou désactivé' });
    }
    res.json({ user: publique(user) });
  } catch (err) {
    next(err);
  }
}
