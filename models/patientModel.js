import { query } from '../config/db.js';

export async function lister({ q, sexe, groupe, assure, limite, offset }) {
  const { rows } = await query(`
    SELECT p.id, p.nom, p.prenom, to_char(p.date_naissance, 'YYYY-MM-DD') AS date_naissance,
           EXTRACT(YEAR FROM age(p.date_naissance))::int AS age,
           p.sexe, p.telephone, p.email, p.adresse, p.groupe_sanguin, p.allergies, p.assure,
           COUNT(*) OVER()::int AS total_count
      FROM patients p
     WHERE ($1::text IS NULL
            OR p.nom ILIKE '%' || $1 || '%' OR p.prenom ILIKE '%' || $1 || '%'
            OR (p.prenom || ' ' || p.nom) ILIKE '%' || $1 || '%'
            OR p.telephone ILIKE '%' || $1 || '%' OR p.email ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR p.sexe = $2)
       AND ($3::text IS NULL OR p.groupe_sanguin = $3)
       AND ($4::boolean IS NULL OR p.assure = $4)
     ORDER BY p.nom, p.prenom
     LIMIT $5 OFFSET $6
  `, [q, sexe, groupe, assure, limite, offset]);
  return rows;
}

export async function trouver(id) {
  const { rows } = await query(`
    SELECT p.id, p.nom, p.prenom, to_char(p.date_naissance, 'YYYY-MM-DD') AS date_naissance,
           EXTRACT(YEAR FROM age(p.date_naissance))::int AS age,
           p.sexe, p.telephone, p.email, p.adresse, p.groupe_sanguin, p.allergies, p.assure,
           (SELECT COUNT(*) FROM dossiers d WHERE d.patient_id = p.id)::int AS nb_dossiers
      FROM patients p WHERE p.id = $1
  `, [id]);
  if (!rows[0]) return null;

  const rdv = await query(`
    SELECT r.id, to_char(r.date_rdv, 'YYYY-MM-DD') AS date_rdv, to_char(r.heure_rdv, 'HH24:MI') AS heure_rdv,
           r.motif, r.statut, m.prenom AS medecin_prenom, m.nom AS medecin_nom
      FROM rendez_vous r JOIN medecins m ON m.id = r.medecin_id
     WHERE r.patient_id = $1
     ORDER BY r.date_rdv DESC, r.heure_rdv DESC
     LIMIT 5
  `, [id]);
  return { ...rows[0], derniers_rdv: rdv.rows };
}

export async function supprimer(id) {
  const { rows } = await query('DELETE FROM patients WHERE id = $1 RETURNING id, prenom, nom', [id]);
  return rows[0] || null;
}
