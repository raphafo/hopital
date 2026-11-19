// Requêtes SQL génériques (ajout, modif, suppression) pour patients, médecins, rdv et dossiers.
// Au lieu d'écrire 4 fois les mêmes requêtes, on décrit chaque table dans RESOURCES.

import { query } from '../config/db.js';

// Pour chaque type :
// table = nom de la table, select = colonnes renvoyées, order = tri,
// insert / update = colonnes qu'on a le droit d'écrire (les autres sont ignorées)
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
    // fichier_data (le PDF) n'est pas dans le select : trop lourd, on le récupère à part
    select: 'id, patient_id, medecin_id, rendez_vous_id, diagnostic, traitement, notes, fichier_nom, fichier_type, created_at, updated_at',
    order: 'created_at DESC, id DESC',
    insert: ['patient_id', 'medecin_id', 'rendez_vous_id', 'diagnostic', 'traitement', 'notes', 'fichier_nom', 'fichier_type', 'fichier_data'],
    update: ['patient_id', 'medecin_id', 'rendez_vous_id', 'diagnostic', 'traitement', 'notes', 'fichier_nom', 'fichier_type', 'fichier_data'],
  },
};

// renvoie la description du type, ou une erreur si le type n'existe pas
function resource(type) {
  const definition = RESOURCES[type];
  if (!definition) throw new Error(`Ressource inconnue : ${type}`);
  return definition;
}

// tous les éléments d'un type (pour les dossiers d'un médecin : seulement les siens)
export async function lister(type, { medecinId = null } = {}) {
  const definition = resource(type);
  if (type === 'dossiers' && medecinId != null) {
    const { rows } = await query(
      `SELECT ${definition.select} FROM ${definition.table} WHERE medecin_id = $1 ORDER BY ${definition.order}`,
      [medecinId]
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT ${definition.select} FROM ${definition.table} ORDER BY ${definition.order}`
  );
  return rows;
}

// un élément par son id
export async function trouver(type, id) {
  const definition = resource(type);
  const { rows } = await query(
    `SELECT ${definition.select} FROM ${definition.table} WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

// INSERT construit à partir des valeurs reçues.
// ex : { nom: 'Henry', prenom: 'Jean' } donne INSERT INTO patients (nom, prenom) VALUES ($1, $2)
// les noms de colonnes viennent de la liste insert, jamais de l'utilisateur
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

// UPDATE construit de la même façon ($1 = id, puis $2, $3... = les valeurs)
// pour un médecin on ajoute "AND medecin_id = ..." : il ne peut modifier que ses dossiers
// renvoie null si rien n'a été trouvé
export async function modifier(type, id, values, { medecinId = null } = {}) {
  const definition = resource(type);
  const entries = Object.entries(values).filter(([column]) => definition.update.includes(column));
  if (!entries.length) return null;

  const assignments = entries.map(([column], index) => `${column} = $${index + 2}`);
  const params = [id, ...entries.map(([, value]) => value)];
  let condition = 'id = $1';
  if (type === 'dossiers' && medecinId != null) {
    params.push(medecinId);
    condition += ` AND medecin_id = $${params.length}`;
  }
  const { rows } = await query(
    `UPDATE ${definition.table}
        SET ${assignments.join(', ')}${type === 'dossiers' ? ', updated_at = NOW()' : ''}
      WHERE ${condition}
      RETURNING ${definition.select}`,
    params
  );
  return rows[0] || null;
}

// DELETE avec la même restriction médecin que modifier()
export async function supprimer(type, id, { medecinId = null } = {}) {
  const definition = resource(type);
  const params = [id];
  let condition = 'id = $1';
  if (type === 'dossiers' && medecinId != null) {
    params.push(medecinId);
    condition += ` AND medecin_id = $${params.length}`;
  }
  const { rows } = await query(
    `DELETE FROM ${definition.table} WHERE ${condition} RETURNING id`,
    params
  );
  return rows[0] || null;
}
