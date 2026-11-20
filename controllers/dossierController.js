// Routes spécifiques aux dossiers médicaux : liste, détail, PDF joint,
// et la vérification qu'un médecin ne touche qu'à ses propres dossiers.

import * as Dossiers from '../models/dossierModel.js';
import * as Medecins from '../models/medecinModel.js';
import { lirePagination, lireRecherche, reponsePage, idValide } from '../utils/filtres.js';

// pour un médecin : renvoie l'id de sa fiche médecin (ou -1 s'il n'en a pas, donc aucun résultat)
// pour l'admin : null = pas de restriction
async function medecinImpose(req) {
  if (req.user.role !== 'medecin') return null;
  return (await Medecins.idParUtilisateur(req.user.id)) ?? -1;
}

// GET /api/dossiers?q=...&page=...
export async function lister(req, res, next) {
  try {
    const paginationActive = req.query.page != null || req.query.limite != null;
    const pagination = lirePagination(req.query, { limiteParDefaut: 10 });
    const { items, total } = await Dossiers.lister({
      q: lireRecherche(req.query),
      medecinId: await medecinImpose(req),
      limite: paginationActive ? pagination.limite : null,
      offset: pagination.offset,
    });
    res.set('Cache-Control', 'no-store');
    res.json(paginationActive ? reponsePage(items, pagination, total) : { dossiers: items });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ erreur: err.message });
    next(err);
  }
}

// GET /api/dossiers/:id
export async function detail(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide.' });
    const dossier = await Dossiers.trouver(id, await medecinImpose(req));
    if (!dossier) return res.status(404).json({ erreur: 'Dossier introuvable.' });
    res.set('Cache-Control', 'no-store');
    res.json({ dossier });
  } catch (err) {
    next(err);
  }
}

// Prépare le nom du fichier pour l'en-tête Content-Disposition.
// On enlève les caractères dangereux (/, \, retours à la ligne) et on donne
// une version ASCII + une version UTF-8 pour garder les accents.
function nomFichier(fichierNom, id) {
  const original = String(fichierNom || `dossier-${id}.pdf`).replace(/[\/\\\r\n]/g, '_');
  const fallback = original.replace(/[^\x20-\x7E]/g, '_').replace(/[^A-Za-z0-9._ -]/g, '_') || `dossier-${id}.pdf`;
  const encodeRfc5987 = (valeur) => encodeURIComponent(valeur).replace(/['()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `filename="${fallback}"; filename*=UTF-8''${encodeRfc5987(original)}`;
}

// GET /api/dossiers/:id/fichier : envoie le PDF stocké en base
// ?telecharger=1 pour le télécharger, sinon il s'ouvre dans le navigateur
export async function fichier(req, res, next) {
  try {
    const id = idValide(req.params.id);
    if (!id) return res.status(400).json({ erreur: 'Identifiant invalide.' });
    const fichier = await Dossiers.fichier(id, await medecinImpose(req));
    if (!fichier || !fichier.fichier_data || fichier.fichier_type !== 'application/pdf') {
      return res.status(404).json({ erreur: 'Fichier PDF introuvable.' });
    }

    const disposition = req.query.telecharger === '1' ? 'attachment' : 'inline';
    // pas de cache (données médicales) et nosniff pour que le navigateur le traite bien comme un PDF
    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${disposition}; ${nomFichier(fichier.fichier_nom, id)}`,
      'Content-Length': fichier.fichier_data.length,
      'X-Content-Type-Options': 'nosniff',
    });
    res.type('application/pdf').send(fichier.fichier_data);
  } catch (err) {
    next(err);
  }
}

// Middleware lancé avant chaque ajout / modif / suppression de dossier.
// L'admin passe directement. Pour un médecin :
// - il doit avoir une fiche médecin liée à son compte
// - en PUT/DELETE, le dossier doit être à lui
// - en POST/PUT, il ne peut pas mettre un autre médecin ; s'il n'en met pas, on met le sien
export async function verifierModificationMedecin(req, res, next) {
  if (req.user.role !== 'medecin') return next();

  try {
    const medecinId = await Medecins.idParUtilisateur(req.user.id);
    if (!medecinId) return res.status(403).json({ erreur: 'Aucun profil médecin n’est lié à ce compte.' });
    req.medecinId = medecinId; // récupéré ensuite par clinicalController

    if (req.method === 'PUT' || req.method === 'DELETE') {
      const id = Number(req.params.id);
      if (Number.isSafeInteger(id) && id > 0) {
        const dossier = await Dossiers.trouver(id, medecinId);
        if (!dossier) {
          return res.status(404).json({ erreur: 'Dossier introuvable.' });
        }
      }
    }

    if ((req.method === 'POST' || req.method === 'PUT') && req.body &&
        typeof req.body === 'object' && !Array.isArray(req.body)) {
      const demande = req.body.medecin_id;
      if (demande != null && demande !== '') {
        const idDemande = Number(demande);
        if (Number.isInteger(idDemande) && idDemande > 0 && idDemande !== medecinId) {
          return res.status(403).json({ erreur: 'Vous ne pouvez gérer que vos propres dossiers.' });
        }
      } else {
        req.body = { ...req.body, medecin_id: medecinId };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
