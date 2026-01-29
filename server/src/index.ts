import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db/index';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import { initializeDatabase } from './db/init';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

const PgSession = connectPgSimple(session);

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'ai-humanity-compass-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

app.use(express.static(path.join(__dirname, '../../dist/public')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../dist/public/index.html'));
  }
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
