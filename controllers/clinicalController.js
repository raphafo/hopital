import * as Clinical from '../models/clinicalModel.js';
import { enregistrerActivite } from '../models/activiteModel.js';
import { query } from '../config/db.js';

const RE_NOM = /^[\p{L}][\p{L} '\-]{1,79}$/u;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_TELEPHONE = /^5\d{3} ?\d{4}$/;
const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SPECIALITES = ['Médecine générale', 'Cardiologie', 'Pédiatrie', 'Orthopédie', 'Dermatologie'];
const STATUTS_RDV = ['planifie', 'termine', 'annule'];
const TAILLE_MAX_FICHIER = 2 * 1024 * 1024;
const RE_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const TYPE_ACTIVITE = { patients: 'patient', medecins: 'medecin', rdv: 'rendez_vous', dossiers: 'dossier' };

function objet(body) {
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

function texte(body, nom, erreurs, { obligatoire = false, maximum = Infinity } = {}) {
  const valeur = body[nom];
  if (valeur == null || valeur === '') {
    if (obligatoire) erreurs[nom] = 'Ce champ est obligatoire.';
    return null;
  }
  if (typeof valeur !== 'string') {
    erreurs[nom] = 'Valeur invalide.';
    return null;
  }
  const resultat = valeur.trim();
  if (!resultat && obligatoire) erreurs[nom] = 'Ce champ est obligatoire.';
  else if (resultat.length > maximum) erreurs[nom] = `Maximum ${maximum} caractères.`;
  return resultat || null;
}

function entierPositif(value) {
  const nombre = typeof value === 'string' && value.trim() ? Number(value) : value;
  return Number.isInteger(nombre) && nombre > 0 ? nombre : null;
}

function dateValide(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validerIdentite(body, erreurs) {
  const prenom = texte(body, 'prenom', erreurs, { obligatoire: true, maximum: 80 });
  const nom = texte(body, 'nom', erreurs, { obligatoire: true, maximum: 80 });
  if (prenom && !RE_NOM.test(prenom)) erreurs.prenom = 'Prénom invalide.';
  if (nom && !RE_NOM.test(nom)) erreurs.nom = 'Nom invalide.';
  return { prenom, nom };
}

function validerTelephone(body, erreurs) {
  const telephone = texte(body, 'telephone', erreurs, { maximum: 30 });
  if (telephone && !RE_TELEPHONE.test(telephone)) erreurs.telephone = 'Format attendu : 5xxx xxxx.';
  return telephone;
}

function validerEmail(body, erreurs) {
  const email = texte(body, 'email', erreurs, { maximum: 150 });
  if (email && !RE_EMAIL.test(email)) erreurs.email = 'Adresse email invalide.';
  return email?.toLowerCase() ?? null;
}

function validerPatient(body) {
  const erreurs = {};
  const { nom, prenom } = validerIdentite(body, erreurs);
  const date_naissance = texte(body, 'date_naissance', erreurs, { obligatoire: true });
  if (date_naissance && (!dateValide(date_naissance) || date_naissance > new Date().toISOString().slice(0, 10))) {
    erreurs.date_naissance = 'Date de naissance invalide.';
  }
  const sexe = texte(body, 'sexe', erreurs, { obligatoire: true });
  if (sexe && !['M', 'F'].includes(sexe)) erreurs.sexe = 'Sexe invalide.';
  const telephone = validerTelephone(body, erreurs);
  const email = validerEmail(body, erreurs);
  const adresse = texte(body, 'adresse', erreurs, { maximum: 255 });
  const groupe_sanguin = texte(body, 'groupe_sanguin', erreurs, { maximum: 3 });
  if (groupe_sanguin && !GROUPES_SANGUINS.includes(groupe_sanguin)) erreurs.groupe_sanguin = 'Groupe sanguin invalide.';
  const allergies = texte(body, 'allergies', erreurs);
  if (typeof body.assure !== 'boolean') erreurs.assure = 'Ce champ doit être un booléen.';
  return {
    erreurs,
    values: { nom, prenom, date_naissance, sexe, telephone, email, adresse, groupe_sanguin, allergies, assure: body.assure },
  };
}

function validerMedecin(body) {
  const erreurs = {};
  const { nom, prenom } = validerIdentite(body, erreurs);
  const specialite = texte(body, 'specialite', erreurs, { obligatoire: true, maximum: 100 });
  if (specialite && !SPECIALITES.includes(specialite)) erreurs.specialite = 'Spécialité invalide.';
  const telephone = validerTelephone(body, erreurs);
  const email = validerEmail(body, erreurs);
  const photo_url = texte(body, 'photo_url', erreurs, { maximum: 255 });
  if (typeof body.disponible !== 'boolean') erreurs.disponible = 'Ce champ doit être un booléen.';
  return {
    erreurs,
    values: { nom, prenom, specialite, telephone, email, disponible: body.disponible, photo_url },
  };
}

function validerRendezVous(body) {
  const erreurs = {};
  const patient_id = entierPositif(body.patient_id);
  const medecin_id = entierPositif(body.medecin_id);
  if (!patient_id) erreurs.patient_id = 'Patient invalide.';
  if (!medecin_id) erreurs.medecin_id = 'Médecin invalide.';
  const date_rdv = texte(body, 'date_rdv', erreurs, { obligatoire: true });
  if (date_rdv && !dateValide(date_rdv)) erreurs.date_rdv = 'Date invalide.';
  const heure_rdv = texte(body, 'heure_rdv', erreurs, { obligatoire: true });
  if (heure_rdv && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(heure_rdv)) {
    erreurs.heure_rdv = 'Heure invalide.';
  }
  const motif = texte(body, 'motif', erreurs, { obligatoire: true, maximum: 255 });
  const statut = texte(body, 'statut', erreurs, { obligatoire: true, maximum: 20 });
  if (statut && !STATUTS_RDV.includes(statut)) erreurs.statut = 'Statut invalide.';
  return { erreurs, values: { patient_id, medecin_id, date_rdv, heure_rdv, motif, statut } };
}

function validerDossier(body) {
  const erreurs = {};
  const patient_id = entierPositif(body.patient_id);
  const medecin_id = body.medecin_id == null || body.medecin_id === '' ? null : entierPositif(body.medecin_id);
  const rendez_vous_id = body.rendez_vous_id == null || body.rendez_vous_id === '' ? null : entierPositif(body.rendez_vous_id);
  if (!patient_id) erreurs.patient_id = 'Patient invalide.';
  if (body.medecin_id != null && body.medecin_id !== '' && !medecin_id) erreurs.medecin_id = 'Médecin invalide.';
  if (body.rendez_vous_id != null && body.rendez_vous_id !== '' && !rendez_vous_id) erreurs.rendez_vous_id = 'Rendez-vous invalide.';
  const diagnostic = texte(body, 'diagnostic', erreurs, { obligatoire: true });
  const traitement = texte(body, 'traitement', erreurs);
  const notes = texte(body, 'notes', erreurs);
  const values = { patient_id, medecin_id, rendez_vous_id, diagnostic, traitement, notes };

  const champsFichier = ['fichier_nom', 'fichier_type', 'fichier_data'];
  if (champsFichier.some((champ) => Object.hasOwn(body, champ))) {
    const fichier_nom = texte(body, 'fichier_nom', erreurs, { obligatoire: true, maximum: 255 });
    const fichier_type = texte(body, 'fichier_type', erreurs, { obligatoire: true, maximum: 100 });
    const fichier_data = body.fichier_data;
    if (fichier_type && fichier_type !== 'application/pdf') erreurs.fichier = 'Seuls les fichiers PDF sont acceptés.';
    if (typeof fichier_data !== 'string' || !RE_BASE64.test(fichier_data)) {
      erreurs.fichier = 'Fichier PDF invalide.';
    } else {
      const contenu = Buffer.from(fichier_data, 'base64');
      if (contenu.length > TAILLE_MAX_FICHIER) erreurs.fichier = 'Le fichier dépasse 2 Mo.';
      else if (contenu.subarray(0, 1024).indexOf('%PDF-') === -1) erreurs.fichier = 'Le fichier envoyé n’est pas un PDF valide.';
      else values.fichier_data = contenu;
    }
    if (fichier_nom) values.fichier_nom = fichier_nom;
    if (fichier_type) values.fichier_type = fichier_type;
  }
  return { erreurs, values };
}

const VALIDATEURS = {
  patients: validerPatient,
  medecins: validerMedecin,
  rdv: validerRendezVous,
  dossiers: validerDossier,
};

function validerId(req, res) {
  const id = entierPositif(req.params.id);
  if (!id) {
    res.status(400).json({ erreur: 'Identifiant invalide.' });
    return null;
  }
  return id;
}

function gererErreurBase(err, res, next) {
  if (err.code === '23505') {
    const champs = err.constraint === 'uq_rdv_creneau'
      ? { heure_rdv: 'Ce créneau est déjà réservé pour ce médecin.' }
      : {};
    res.status(409).json({ erreur: 'Cet enregistrement existe déjà ou ce créneau est occupé.', champs });
    return;
  }
  if (err.code === '23503') {
    res.status(409).json({ erreur: 'Cette opération est impossible car des enregistrements liés existent ou sont introuvables.' });
    return;
  }
  if (err.code === '23514' || err.code === '22P02') {
    res.status(400).json({ erreur: 'Les données ne respectent pas les contraintes de la base.' });
    return;
  }
  next(err);
}

function description(type, action, values, id) {
  const nom = values?.prenom && values?.nom ? `${values.prenom} ${values.nom}` : `n° ${id}`;
  const verbe = { creation: 'créé', modification: 'modifié', suppression: 'supprimé' }[action];
  const sujet = { patients: 'Patient', medecins: 'Médecin', rdv: 'Rendez-vous', dossiers: 'Dossier' }[type];
  return `${sujet} ${verbe} : ${nom}`;
}

async function verifierRendezVousDossier(values) {
  if (!values.rendez_vous_id) return null;
  const { rows } = await query(
    'SELECT patient_id, medecin_id FROM rendez_vous WHERE id = $1',
    [values.rendez_vous_id]
  );
  const rendezVous = rows[0];
  if (!rendezVous) return 'Rendez-vous introuvable.';
  if (rendezVous.patient_id !== values.patient_id) {
    return 'Le rendez-vous doit concerner le patient sélectionné.';
  }
  if (rendezVous.medecin_id !== values.medecin_id) {
    return 'Le rendez-vous doit être attribué au médecin sélectionné.';
  }
  return null;
}

export function creerHandlers(type) {
  const valider = VALIDATEURS[type];
  if (!valider) throw new Error(`Validateur inconnu : ${type}`);

  return {
    lister: async (req, res, next) => {
      try {
        res.json({ [type]: await Clinical.lister(type) });
      } catch (err) {
        next(err);
      }
    },
    creer: async (req, res, next) => {
      const { values, erreurs } = valider(objet(req.body));
      if (Object.keys(erreurs).length) {
        return res.status(400).json({ erreur: 'Données invalides.', champs: erreurs });
      }
      if (type === 'rdv') values.created_by = req.user.id;

      try {
        if (type === 'dossiers') {
          const erreurLien = await verifierRendezVousDossier(values);
          if (erreurLien) return res.status(400).json({ erreur: 'Données invalides.', champs: { rendez_vous_id: erreurLien } });
        }
        const record = await Clinical.creer(type, values);
        await enregistrerActivite({
          userId: req.user.id,
          action: 'creation',
          entite: TYPE_ACTIVITE[type],
          entiteId: record.id,
          description: description(type, 'creation', values, record.id),
        });
        res.status(201).json({ [type === 'rdv' ? 'rendez_vous' : type.slice(0, -1)]: record });
      } catch (err) {
        gererErreurBase(err, res, next);
      }
    },
    modifier: async (req, res, next) => {
      const id = validerId(req, res);
      if (!id) return;
      const { values, erreurs } = valider(objet(req.body));
      if (Object.keys(erreurs).length) {
        return res.status(400).json({ erreur: 'Données invalides.', champs: erreurs });
      }

      try {
        if (type === 'dossiers') {
          const erreurLien = await verifierRendezVousDossier(values);
          if (erreurLien) return res.status(400).json({ erreur: 'Données invalides.', champs: { rendez_vous_id: erreurLien } });
        }
        const record = await Clinical.modifier(type, id, values, { medecinId: req.medecinId });
        if (!record) return res.status(404).json({ erreur: 'Enregistrement introuvable.' });
        await enregistrerActivite({
          userId: req.user.id,
          action: 'modification',
          entite: TYPE_ACTIVITE[type],
          entiteId: id,
          description: description(type, 'modification', values, id),
        });
        res.json({ [type === 'rdv' ? 'rendez_vous' : type.slice(0, -1)]: record });
      } catch (err) {
        gererErreurBase(err, res, next);
      }
    },
    supprimer: async (req, res, next) => {
      const id = validerId(req, res);
      if (!id) return;

      try {
        const record = await Clinical.supprimer(type, id, { medecinId: req.medecinId });
        if (!record) return res.status(404).json({ erreur: 'Enregistrement introuvable.' });
        await enregistrerActivite({
          userId: req.user.id,
          action: 'suppression',
          entite: TYPE_ACTIVITE[type],
          entiteId: id,
          description: description(type, 'suppression', null, id),
        });
        res.status(204).end();
      } catch (err) {
        gererErreurBase(err, res, next);
      }
    },
  };
}
