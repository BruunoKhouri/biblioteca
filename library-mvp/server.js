require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb } = require('./src/db');
const booksRouter = require('./src/routes/books');
const valuationRouter = require('./src/routes/valuation');

async function bootstrap() {
  await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use('/api/books', booksRouter);
  app.use('/api/valuation', valuationRouter);

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({
      error: 'Erro interno no servidor.',
      details: err.message
    });
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Falha ao iniciar aplicação:', error);
  process.exit(1);
});
