'use strict';

/**
 * Punto de entrada del servidor.
 *   npm start      -> inicia el servidor
 *   npm run dev    -> inicia y reinicia automáticamente al cambiar archivos
 */

const path = require('path');
const express = require('express');
const config = require('./config');
const db = require('./services/db');
const ai = require('./services/ai');
const { Retriever } = require('./services/retriever');
const { loadEstatutoData, buildEstatutoData } = require('./services/estatutoStore');
const { createApiRouter } = require('./routes/api');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { createCorsMiddleware } = require('./middleware/cors');

/** Carga el Estatuto procesado; si no existe intenta descargarlo y procesarlo. */
async function loadRetriever() {
  let payload = loadEstatutoData(config.estatuto.dataFile);
  if (!payload) {
    console.log('[estatuto] No existe data/estatuto.json. Intentando prepararlo desde la fuente oficial...');
    try {
      payload = await buildEstatutoData(config.estatuto);
    } catch (err) {
      console.error(`[estatuto] No se pudo preparar el Estatuto: ${err.message}`);
      console.error('[estatuto] Ejecuta "npm run build:data" (o "npm run build:data -- ruta/al.pdf") y reinicia.');
      return null;
    }
  }
  const retriever = new Retriever(payload.chunks, config.retrieval);
  console.log(`[estatuto] ${retriever.size} fragmentos cargados.`);
  return retriever;
}

async function main() {
  const retriever = await loadRetriever();
  await db.init();

  if (!config.openai.apiKey) {
    console.warn('[ai] OPENAI_API_KEY vacía: el chatbot usará el modo básico (sin redacción con IA).');
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(createCorsMiddleware(config.cors.allowedOrigins));
  app.use(express.json({ limit: '50kb' }));

  app.use('/api', createApiRouter({ retriever, ai, db }));
  app.use('/api', notFound);

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(errorHandler);

  app.listen(config.port, () => {
    console.log(`\n  Chatbot del Estatuto UASD listo en http://localhost:${config.port}\n`);
  });
}

main().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
