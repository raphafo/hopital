// Routes spécifiques aux rendez-vous : liste, changement de statut, suppression.
// L'ajout et la modification passent par clinicalController.js

import * as Rdv from '../models/rdvModel.js';
import * as Medecins from '../models/medecinModel.js';
import { enregistrerActivite } from '../models/activiteModel.js';
import { lirePagination, lireRecherche, lireFiltres, reponsePage, idValide } from '../utils/filtres.js';

const STATUTS = ['planifie', 'termine', 'annule'];
const LIBELLES = { termine: 'terminé', annule: 'annulé' }; // pour le texte de l'historique

// Un médecin ne voit que ses propres rendez-vous (-1 : aucun médecin lié au compte, donc aucun résultat)
async function restrictionMedecin(req) {
  if (req.user.role !== 'medecin') return null;
  return (await Medecins.idParUtilisateur(req.user.id)) ?? -1;
}

// GET /api/rdv?q=...&statut=...&medecin_id=...&date_debut=...&date_fin=...&page=...
// pour un médecin, on force le filtre sur ses rendez-vous quoi qu'il envoie
export async function lister(req, res, next) {
  try {
    const { filtres, erreur } = lireFiltres(req.query, {
      statut: { enumeration: STATUTS },
      medecin_id: { entier: true },
      date_debut: { date: true },
      date_fin: { date: true },
    });
    if (erreur) return res.status(400).json({ erreur: `Paramètre invalide : ${erreur}` });

    if (filtres.date_debut && filtres.date_fin && filtres.date_debut > filtres.date_fin) {
      return res.status(400).json({ erreur: 'La date de début doit précéder la date de fin.' });
    }
    const paginationActive = req.query.page != null || req.query.limite != null;
    const pagination = lirePagination(req.query, { limiteParDefaut: 10 });
    const medecinImpose = await restrictionMedecin(req);
    const { items, total } = await Rdv.lister({
      q: lireRecherche(req.query),
      statut: filtres.statut,
      medecinId: medecinImpose ?? filtres.medecin_id,
      dateDebut: filtres.date_debut,
      dateFin: filtres.date_fin,
      limite: paginationActive ? pagination.limite : null,
      offset: pagination.offset,
    });
    res.set('Cache-Control', 'no-store');
    res.json(paginationActive ? reponsePage(items, pagination, total) : { rdv: items });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ erreur: err.message });
    next(err);
  }
}

// PATCH /api/rdv/:id/statut  { statut: 'termine' | 'annule' }
// seulement sur un rdv encore planifié, et un médecin seulement sur les siens
export async function changerStatut(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });

    const statut = req.body?.statut;
    if (!['termine', 'annule'].includes(statut)) {
      return res.status(400).json({ erreur: 'Statut invalide (termine ou annule attendu).' });
    }

    const rdv = await Rdv.trouver(id);
    if (!rdv) return res.status(404).json({ erreur: 'Rendez-vous introuvable' });

    const medecinImpose = await restrictionMedecin(req);
    if (medecinImpose !== null && rdv.medecin_id !== medecinImpose) {
      return res.status(403).json({ erreur: 'Ce rendez-vous ne vous est pas attribué.' });
    }
    if (rdv.statut !== 'planifie') {
      return res.status(409).json({ erreur: 'Seul un rendez-vous planifié peut être modifié.' });
    }

    // la requête SQL revérifie "planifie" au cas où quelqu'un l'aurait changé entre-temps
    if (!(await Rdv.changerStatut(id, statut))) {
      return res.status(409).json({ erreur: 'Seul un rendez-vous planifié peut être modifié.' });
    }
    await enregistrerActivite({
      userId: req.user.id, action: 'modification', entite: 'rendez_vous', entiteId: id,
      description: `Rendez-vous ${LIBELLES[statut]} : ${rdv.patient_prenom} ${rdv.patient_nom} (Dr ${rdv.medecin_nom})`,
    });
    res.json({ rdv: { ...rdv, statut } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/rdv/:id
// on lit d'abord le rdv pour avoir les noms à mettre dans l'historique
export async function supprimer(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide' });

    const rdv = await Rdv.trouver(id);
    if (!rdv) return res.status(404).json({ erreur: 'Rendez-vous introuvable' });

    if (!(await Rdv.supprimer(id))) return res.status(404).json({ erreur: 'Rendez-vous introuvable' });
    await enregistrerActivite({
      userId: req.user.id, action: 'suppression', entite: 'rendez_vous', entiteId: id,
      description: `Rendez-vous supprimé : ${rdv.patient_prenom} ${rdv.patient_nom} (Dr ${rdv.medecin_nom})`,
    });
    res.json({ message: 'Rendez-vous supprimé' });
  } catch (err) {
    next(err);
  }
}