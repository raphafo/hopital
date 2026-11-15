import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API
app.use('/api', routes);
app.use('/api', (req, res) => {
  res.status(404).json({ erreur: 'Route introuvable' });
});

// Fichiers statiques : utile en local. Sur Vercel, c'est le dossier public/ qui est servi directement.
app.use(express.static(path.join(__dirname, 'public')));

// Gestion centralisée des erreurs
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

export default app;
