# Gestion hospitalière

Application web de gestion hospitalière (Laboratoire 5) : patients, médecins, rendez-vous, dossiers et statistiques.

## Technologies
- HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js
- Node.js + Express
- PostgreSQL
- Authentification JWT (cookie httpOnly) + bcrypt
- Déploiement : Vercel

## Permissions par rôle
- **Admin** : accès à toutes les pages et ressources, y compris le tableau de bord et les utilisateurs.
- **Secrétaire** : gestion des patients et des rendez-vous; consultation des médecins; pas d'accès aux dossiers médicaux ni au tableau de bord. Un patient ayant un dossier médical ne peut être supprimé que par un administrateur.
- **Médecin** : consultation des patients et médecins, gestion de ses rendez-vous assignés (statut uniquement) et de ses dossiers médicaux.

## Lancer en local
1. `npm install`
2. Copier `.env.example` en `.env` et renseigner `DATABASE_URL` et `JWT_SECRET`
3. `npm run db:init` (crée les tables et les données de test, supprime les tables existantes)
4. `npm run db:users` (crée les comptes de test admin, médecin, secrétaire)
5. `npm test` pour exécuter les tests
6. `npm run dev` puis ouvrir http://localhost:3000

## Structure
```
server.js          point d'entrée Express (exporté pour Vercel)
config/db.js       connexion PostgreSQL
middleware/        authentification et rôles
routes/            routes de l'API
controllers/       logique métier
models/            requêtes SQL
utils/             validation des filtres et de la pagination
sql/               schema.sql et seed.sql
scripts/           init-db.js et create-users.js
tests/             tests automatisés
public/            pages HTML, CSS, JS, images
```

## lien github et appli
https://hopital-tau.vercel.app/

https://github.com/raphafo/hopital.git


## Captures d'écran


## Auteures
Ingrid , Cassandra