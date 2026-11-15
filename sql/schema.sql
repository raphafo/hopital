-- =====================================================
-- Gestion hospitalière : schéma PostgreSQL
-- Exécuter ce fichier en premier, puis seed.sql
-- =====================================================

DROP VIEW  IF EXISTS v_consultations_par_mois CASCADE;
DROP VIEW  IF EXISTS v_rdv_par_specialite CASCADE;
DROP TABLE IF EXISTS activites    CASCADE;
DROP TABLE IF EXISTS dossiers     CASCADE;
DROP TABLE IF EXISTS rendez_vous  CASCADE;
DROP TABLE IF EXISTS medecins     CASCADE;
DROP TABLE IF EXISTS patients     CASCADE;
DROP TABLE IF EXISTS users        CASCADE;

-- -----------------------------------------------------
-- Utilisateurs et rôles (authentification)
-- -----------------------------------------------------
CREATE TABLE users (
    id                SERIAL PRIMARY KEY,
    nom               VARCHAR(80)  NOT NULL,
    prenom            VARCHAR(80)  NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role              VARCHAR(20)  NOT NULL DEFAULT 'secretaire'
                      CHECK (role IN ('admin', 'medecin', 'secretaire')),
    actif             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- Médecins (un médecin peut avoir un compte utilisateur)
-- -----------------------------------------------------
CREATE TABLE medecins (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    nom          VARCHAR(80)  NOT NULL,
    prenom       VARCHAR(80)  NOT NULL,
    specialite   VARCHAR(100) NOT NULL,
    telephone    VARCHAR(30),
    email        VARCHAR(150) UNIQUE,
    disponible   BOOLEAN      NOT NULL DEFAULT TRUE,
    photo_url    VARCHAR(255),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- Patients
-- -----------------------------------------------------
CREATE TABLE patients (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(80)  NOT NULL,
    prenom          VARCHAR(80)  NOT NULL,
    date_naissance  DATE         NOT NULL CHECK (date_naissance <= CURRENT_DATE),
    sexe            CHAR(1)      NOT NULL CHECK (sexe IN ('M', 'F')),
    telephone       VARCHAR(30),
    email           VARCHAR(150),
    adresse         VARCHAR(255),
    groupe_sanguin  VARCHAR(3)
                    CHECK (groupe_sanguin IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    allergies       TEXT,
    assure          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- Rendez-vous
-- -----------------------------------------------------
CREATE TABLE rendez_vous (
    id          SERIAL PRIMARY KEY,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medecin_id  INTEGER NOT NULL REFERENCES medecins(id) ON DELETE RESTRICT,
    date_rdv    DATE    NOT NULL,
    heure_rdv   TIME    NOT NULL,
    motif       VARCHAR(255) NOT NULL,
    statut      VARCHAR(20)  NOT NULL DEFAULT 'planifie'
                CHECK (statut IN ('planifie', 'termine', 'annule')),
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Un médecin ne peut pas avoir deux rendez-vous actifs au même créneau
CREATE UNIQUE INDEX uq_rdv_creneau
    ON rendez_vous (medecin_id, date_rdv, heure_rdv)
    WHERE statut <> 'annule';

-- -----------------------------------------------------
-- Dossiers patients (diagnostic, traitement, fichier joint)
-- Le fichier est stocké en base (limite 2 Mo) car le disque
-- de Vercel n'est pas persistant.
-- -----------------------------------------------------
CREATE TABLE dossiers (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medecin_id      INTEGER REFERENCES medecins(id) ON DELETE SET NULL,
    rendez_vous_id  INTEGER REFERENCES rendez_vous(id) ON DELETE SET NULL,
    diagnostic      TEXT NOT NULL,
    traitement      TEXT,
    notes           TEXT,
    fichier_nom     VARCHAR(255),
    fichier_type    VARCHAR(100),
    fichier_data    BYTEA,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fichier_taille
        CHECK (fichier_data IS NULL OR octet_length(fichier_data) <= 2097152)
);

-- -----------------------------------------------------
-- Historique des activités (affiché sur le dashboard)
-- -----------------------------------------------------
CREATE TABLE activites (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(20) NOT NULL
                CHECK (action IN ('connexion', 'creation', 'modification', 'suppression')),
    entite      VARCHAR(30) NOT NULL
                CHECK (entite IN ('user', 'patient', 'medecin', 'rendez_vous', 'dossier')),
    entite_id   INTEGER,
    description VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- Index pour la recherche et les filtres
-- -----------------------------------------------------
CREATE INDEX idx_patients_nom      ON patients (nom, prenom);
CREATE INDEX idx_medecins_spec     ON medecins (specialite);
CREATE INDEX idx_rdv_date          ON rendez_vous (date_rdv);
CREATE INDEX idx_rdv_patient       ON rendez_vous (patient_id);
CREATE INDEX idx_rdv_statut        ON rendez_vous (statut);
CREATE INDEX idx_dossiers_patient  ON dossiers (patient_id);
CREATE INDEX idx_activites_date    ON activites (created_at DESC);

-- -----------------------------------------------------
-- Vues pour les statistiques du dashboard
-- -----------------------------------------------------
CREATE VIEW v_consultations_par_mois AS
SELECT date_trunc('month', date_rdv)::date AS mois,
       COUNT(*)                            AS nb_consultations
FROM rendez_vous
WHERE statut = 'termine'
GROUP BY 1
ORDER BY 1;

CREATE VIEW v_rdv_par_specialite AS
SELECT m.specialite,
       COUNT(r.id) AS nb_rdv
FROM medecins m
LEFT JOIN rendez_vous r ON r.medecin_id = m.id AND r.statut <> 'annule'
GROUP BY m.specialite
ORDER BY nb_rdv DESC;
