import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import demoRoutes from './routes/demo.js';

export function createDemoApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: false,
  }));
  app.use(express.json({ limit: '200kb' }));
  app.use('/api/demo', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
  }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'commentiq-llm' });
  });
  app.use('/api/demo', demoRoutes);
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

export default createDemoApp;
