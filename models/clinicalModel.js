import { query } from '../config/db.js';

const RESOURCES = {
  patients: {
    table: 'patients',
    select: 'id, nom, prenom, date_naissance, sexe, telephone, email, adresse, groupe_sanguin, allergies, assure, created_at',
    order: 'id DESC',
    insert: ['nom', 'prenom', 'date_naissance', 'sexe', 'telephone', 'email', 'adresse', 'groupe_sanguin', 'allergies', 'assure'],
    update: ['nom', 'prenom', 'date_naissance', 'sexe', 'telephone', 'email', 'adresse', 'groupe_sanguin', 'allergies', 'assure'],
  },
  medecins: {
    table: 'medecins',
    select: 'id, nom, prenom, specialite, telephone, email, disponible, photo_url, created_at',
    order: 'id DESC',
    insert: ['nom', 'prenom', 'specialite', 'telephone', 'email', 'disponible', 'photo_url'],
    update: ['nom', 'prenom', 'specialite', 'telephone', 'email', 'disponible', 'photo_url'],
  },
  rdv: {
    table: 'rendez_vous',
    select: 'id, patient_id, medecin_id, date_rdv, heure_rdv, motif, statut, created_by, created_at',
    order: 'date_rdv DESC, heure_rdv DESC, id DESC',
    insert: ['patient_id', 'medecin_id', 'date_rdv', 'heure_rdv', 'motif', 'statut', 'created_by'],
    update: ['patient_id', 'medecin_id', 'date_rdv', 'heure_rdv', 'motif', 'statut'],
  },
  dossiers: {
    table: 'dossiers',
    select: 'id, patient_id, medecin_id, rendez_vous_id, diagnostic, traitement, notes, fichier_nom, fichier_type, created_at, updated_at',
    order: 'created_at DESC, id DESC',
    insert: ['patient_id', 'medecin_id', 'rendez_vous_id', 'diagnostic', 'traitement', 'notes', 'fichier_nom', 'fichier_type', 'fichier_data'],
    update: ['patient_id', 'medecin_id', 'rendez_vous_id', 'diagnostic', 'traitement', 'notes', 'fichier_nom', 'fichier_type', 'fichier_data'],
  },
};

function resource(type) {
  const definition = RESOURCES[type];
  if (!definition) throw new Error(`Ressource inconnue : ${type}`);
  return definition;
}

export async function lister(type) {
  const definition = resource(type);
  const { rows } = await query(
    `SELECT ${definition.select} FROM ${definition.table} ORDER BY ${definition.order}`
  );
  return rows;
}

export async function creer(type, values) {
  const definition = resource(type);
  const entries = Object.entries(values).filter(([column]) => definition.insert.includes(column));
  const columns = entries.map(([column]) => column);
  const placeholders = entries.map((_, index) => `$${index + 1}`);
  const { rows } = await query(
    `INSERT INTO ${definition.table} (${columns.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING ${definition.select}`,
    entries.map(([, value]) => value)
  );
  return rows[0];
}

export async function modifier(type, id, values) {
  const definition = resource(type);
  const entries = Object.entries(values).filter(([column]) => definition.update.includes(column));
  if (!entries.length) return null;

  const assignments = entries.map(([column], index) => `${column} = $${index + 2}`);
  const { rows } = await query(
    `UPDATE ${definition.table}
        SET ${assignments.join(', ')}${type === 'dossiers' ? ', updated_at = NOW()' : ''}
      WHERE id = $1
      RETURNING ${definition.select}`,
    [id, ...entries.map(([, value]) => value)]
  );
  return rows[0] || null;
}

export async function supprimer(type, id) {
  const definition = resource(type);
  const { rows } = await query(
    `DELETE FROM ${definition.table} WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
}
