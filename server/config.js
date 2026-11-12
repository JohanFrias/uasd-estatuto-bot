'use strict';

/**
 * Configuración central de la aplicación.
 * Todos los valores salen de variables de entorno (.env) con valores por defecto seguros.
 */
require('dotenv').config();
const path = require('path');

const toNumber = (value, fallback) => {
  const n = Number(value);
  return value === undefined || value === '' || Number.isNaN(n) ? fallback : n;
};

module.exports = {
  port: toNumber(process.env.PORT, 3000),
  trustProxy: process.env.TRUST_PROXY === 'true' ? 1 : false,

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'https://johanfrias.github.io')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: toNumber(process.env.MAX_TOKENS, 700),
    timeoutMs: 30000,
  },

  db: {
    enabled: process.env.DB_ENABLED !== 'false',
    host: process.env.DB_HOST || 'localhost',
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'uasd_chatbot',
  },

  estatuto: {
    url:
      process.env.ESTATUTO_URL ||
      'https://postgrado.uasd.edu.do/wp-content/uploads/2024/06/ESTATUTO-ORGANICO-UASD.pdf',
    pdfFile: path.join(__dirname, '..', 'data', 'ESTATUTO-ORGANICO-UASD.pdf'),
    dataFile: path.join(__dirname, '..', 'data', 'estatuto.json'),
  },

  retrieval: {
    topK: 5, // fragmentos que se envían a la IA
    minCoverage: 0.5, // fracción mínima de términos de la pregunta que debe aparecer
    minScore: 2.0, // puntaje BM25 mínimo para considerar que hay información
  },

  limits: {
    maxMessageLength: 500,
    maxHistoryMessages: 6,
    rateLimitPerMinute: 30,
  },
};
