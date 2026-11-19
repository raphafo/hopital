// Gestion des comptes par l'admin (routes /api/users)

import * as Users from '../models/userModel.js';
import { enregistrerActivite } from '../models/activiteModel.js';
import { ROLES } from '../middleware/validate.js';

// GET /api/users : tous les comptes
export async function lister(req, res, next) {
  try {
    res.json({ users: await Users.lister() });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id
// change le rôle et/ou active-désactive un compte.
// L'admin ne peut pas se modifier lui-même (sinon il pourrait se bloquer).
export async function modifier(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erreur: 'Identifiant invalide' });
    if (id === req.user.id) {
      return res.status(400).json({ erreur: 'Vous ne pouvez pas modifier votre propre compte.' });
    }

    // on vérifie ce qui est envoyé : au moins un des deux champs, et des valeurs correctes
    const { role, actif } = req.body ?? {};
    if (role === undefined && actif === undefined) {
      return res.status(400).json({ erreur: 'Rien à modifier (role ou actif attendu).' });
    }
    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ erreur: 'Rôle invalide.' });
    }
    if (actif !== undefined && typeof actif !== 'boolean') {
      return res.status(400).json({ erreur: 'Le champ actif doit être un booléen.' });
    }

    const user = await Users.modifier(id, { role, actif });
    if (!user) return res.status(404).json({ erreur: 'Utilisateur introuvable' });

    // texte de l'historique, ex : "Jean Henry (rôle : medecin, compte activé)"
    const details = [];
    if (role !== undefined) details.push(`rôle : ${role}`);
    if (actif !== undefined) details.push(actif ? 'compte activé' : 'compte désactivé');
    await enregistrerActivite({
      userId: req.user.id, action: 'modification', entite: 'user', entiteId: user.id,
      description: `${user.prenom} ${user.nom} (${details.join(', ')})`,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}
