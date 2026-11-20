-- =====================================================
-- Données de test (à exécuter après schema.sql)
-- Les dates sont relatives à CURRENT_DATE : le dashboard
-- reste cohérent quelle que soit la date de la soutenance.
-- Les comptes utilisateurs (admin, médecin, secrétaire)
-- sont créés par un script Node (mots de passe hachés).
-- =====================================================

-- Médecins (le Dr Ramgoolam est relié au compte médecin par create-users.js grâce à son email)
INSERT INTO medecins (nom, prenom, specialite, telephone, email, disponible) VALUES
('Ramgoolam', 'Anil',    'Médecine générale', '5250 1101', 'anil.ramgoolam@hopital.mu',  TRUE),
('Dupont',    'Sophie',  'Cardiologie',       '5250 1102', 'sophie.dupont@hopital.mu',   TRUE),
('Lagesse',   'Marie',   'Pédiatrie',         '5250 1103', 'marie.lagesse@hopital.mu',   TRUE),
('Bundhun',   'Rajesh',  'Orthopédie',        '5250 1104', 'rajesh.bundhun@hopital.mu',  TRUE),
('Pillay',    'Nadia',   'Dermatologie',      '5250 1105', 'nadia.pillay@hopital.mu',    FALSE);

-- Patients (les id vont de 1 à 12 dans l'ordre d'insertion, utilisés juste en dessous)
INSERT INTO patients (nom, prenom, date_naissance, sexe, telephone, email, adresse, groupe_sanguin, allergies, assure) VALUES
('Soobramanien', 'Kevin',   '1985-03-14', 'M', '5701 2201', 'kevin.s@mail.mu',   'Rose Hill',        'O+',  NULL,                 TRUE),
('Joomun',       'Priya',   '1990-07-22', 'F', '5701 2202', 'priya.j@mail.mu',   'Beau Bassin',      'A+',  'Pénicilline',        TRUE),
('Henry',        'Jean',    '1962-11-02', 'M', '5701 2203', 'jean.h@mail.mu',    'Curepipe',         'B+',  NULL,                 TRUE),
('Appadoo',      'Lucas',   '2018-05-30', 'M', '5701 2204', NULL,                'Quatre Bornes',    'O-',  'Arachides',          FALSE),
('Rughoo',       'Fatima',  '1978-01-18', 'F', '5701 2205', 'fatima.r@mail.mu',  'Vacoas',           'AB+', NULL,                 TRUE),
('Leclerc',      'Emma',    '2016-09-09', 'F', '5701 2206', NULL,                'Phoenix',          'A-',  NULL,                 TRUE),
('Mooneea',      'Sunil',   '1955-12-05', 'M', '5701 2207', NULL,                'Moka',             'B-',  'Aspirine',           TRUE),
('Ramdin',       'Aisha',   '1999-04-27', 'F', '5701 2208', 'aisha.r@mail.mu',   'Flic en Flac',     'O+',  NULL,                 FALSE),
('Gungaram',     'Noah',    '2020-02-11', 'M', '5701 2209', NULL,                'Rose Hill',        'A+',  NULL,                 TRUE),
('Ah-Fat',       'Linda',   '1971-08-16', 'F', '5701 2210', 'linda.af@mail.mu',  'Port-Louis',       'B+',  'Latex',              TRUE),
('Boolell',      'Dev',     '1988-10-03', 'M', '5701 2211', 'dev.b@mail.mu',     'Beau Bassin',      'O+',  NULL,                 FALSE),
('Tuyau',        'Léa',     '2015-06-21', 'F', '5701 2212', NULL,                'Mahébourg',        'AB-', NULL,                 TRUE);

-- Rendez-vous : patient, médecin, jour relatif, heure, motif, statut
INSERT INTO rendez_vous (patient_id, medecin_id, date_rdv, heure_rdv, motif, statut) VALUES
(1,  1, CURRENT_DATE - 150, '09:00', 'Consultation générale',        'termine'),
(2,  2, CURRENT_DATE - 140, '10:30', 'Contrôle cardiaque',           'termine'),
(3,  1, CURRENT_DATE - 130, '08:30', 'Fièvre persistante',           'termine'),
(4,  3, CURRENT_DATE - 120, '14:00', 'Suivi pédiatrique',            'termine'),
(5,  4, CURRENT_DATE - 110, '11:00', 'Douleurs dorsales',            'termine'),
(6,  2, CURRENT_DATE - 100, '09:30', 'Hypertension',                 'termine'),
(7,  5, CURRENT_DATE -  90, '15:00', 'Consultation dermatologique',  'termine'),
(8,  1, CURRENT_DATE -  85, '10:00', 'Bilan annuel',                 'termine'),
(9,  3, CURRENT_DATE -  75, '09:00', 'Vaccination',                  'termine'),
(10, 4, CURRENT_DATE -  65, '16:00', 'Rééducation',                  'termine'),
(11, 2, CURRENT_DATE -  55, '10:30', 'Électrocardiogramme',          'termine'),
(12, 5, CURRENT_DATE -  45, '11:30', 'Allergie cutanée',             'termine'),
(1,  1, CURRENT_DATE -  40, '09:00', 'Renouvellement d''ordonnance', 'termine'),
(6,  3, CURRENT_DATE -  30, '14:30', 'Suivi pédiatrique',            'termine'),
(7,  2, CURRENT_DATE -  25, '08:00', 'Palpitations',                 'annule'),
(8,  4, CURRENT_DATE -  20, '10:00', 'Douleur à l''épaule',          'termine'),
(9,  1, CURRENT_DATE -  14, '09:30', 'Maux de tête',                 'termine'),
(10, 5, CURRENT_DATE -  10, '15:30', 'Acné',                         'termine'),
(11, 2, CURRENT_DATE -   7, '11:00', 'Contrôle de la tension',       'termine'),
(12, 3, CURRENT_DATE -   3, '09:00', 'Fièvre de l''enfant',          'annule'),
(2,  1, CURRENT_DATE +   2, '10:00', 'Consultation générale',        'planifie'),
(3,  2, CURRENT_DATE +   4, '14:00', 'Bilan cardiaque',              'planifie'),
(4,  4, CURRENT_DATE +   6, '09:00', 'Séance de suivi',              'planifie'),
(5,  5, CURRENT_DATE +   9, '16:00', 'Contrôle dermatologique',      'planifie'),
(6,  1, CURRENT_DATE +  12, '11:00', 'Bilan sanguin',                'planifie');

-- Dossiers (liés aux rendez-vous terminés 1, 2, 4, 6, 9, 11)
INSERT INTO dossiers (patient_id, medecin_id, rendez_vous_id, diagnostic, traitement, notes) VALUES
(1,  1, 1,  'Rhinopharyngite',         'Paracétamol, repos 3 jours',          'Revoir si fièvre au-delà de 3 jours'),
(2,  2, 2,  'Tension légèrement élevée','Régime pauvre en sel, contrôle à 1 mois', 'Allergie à la pénicilline notée'),
(4,  3, 4,  'Bon développement',        'Aucun',                                'Allergie aux arachides à surveiller'),
(6,  2, 6,  'Hypertension de stade 1',  'Amlodipine 5 mg',                      'Mesures de tension à domicile'),
(9,  3, 9,  'Vaccination à jour',       'Rappel prévu dans 6 mois',             NULL),
(11, 2, 11, 'ECG normal',               'Aucun',                                'Contrôle annuel conseillé');

-- Historique d'activités de départ
INSERT INTO activites (user_id, action, entite, entite_id, description, created_at) VALUES
(NULL, 'creation',     'patient',     12, 'Nouveau patient enregistré : Tuyau Léa',          NOW() - INTERVAL '6 days'),
(NULL, 'creation',     'rendez_vous', 21, 'Rendez-vous planifié pour Joomun Priya',          NOW() - INTERVAL '5 days'),
(NULL, 'modification', 'rendez_vous', 20, 'Rendez-vous annulé : Tuyau Léa',                  NOW() - INTERVAL '3 days'),
(NULL, 'creation',     'dossier',     6,  'Dossier créé pour Boolell Dev',                   NOW() - INTERVAL '2 days'),
(NULL, 'modification', 'medecin',     5,  'Dr Pillay marquée indisponible',                  NOW() - INTERVAL '1 day');
