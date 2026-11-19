// Point d'entrée du serveur.
// Les URL qui commencent par /api vont vers l'API, le reste sert les fichiers de public/.

import 'dotenv/config'; // charge le fichier .env (DATABASE_URL, JWT_SECRET...)
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';

// __dirname n'existe pas avec "import", donc on le recrée
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// pour lire le JSON envoyé par les pages (3 Mo max à cause des PDF)
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));
// pour lire les cookies, c'est là qu'on garde le jeton de connexion
app.use(cookieParser());

// API
app.use('/api', routes);
// route /api inconnue : on renvoie une 404 en JSON
app.use('/api', (req, res) => {
  res.status(404).json({ erreur: 'Route introuvable' });
});

// Fichiers statiques : utile en local. Sur Vercel, c'est le dossier public/ qui est servi directement.
app.use(express.static(path.join(__dirname, 'public')));

// Gestion centralisée des erreurs
// toutes les erreurs passées avec next(err) arrivent ici
// pour une erreur 500 on ne montre pas le détail technique à l'utilisateur
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    erreur: status === 500 ? 'Erreur interne du serveur' : err.message,
  });
});

// En local uniquement : sur Vercel, l'app est exportée et gérée par la plateforme.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Serveur démarré sur http://localhost:${port}`));
}

// Vercel utilise cet export pour lancer l'app
export default app;
