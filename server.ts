import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './server/routes.ts';
import { seedDatabaseIfEmpty } from './server/seed.ts';

async function startServer() {
  seedDatabaseIfEmpty();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.use('/api', apiRoutes);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Campus ERP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Smart Campus ERP server:', err);
  process.exit(1);
});
