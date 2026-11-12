'use strict';

/**
 * Descarga el PDF oficial del Estatuto, extrae su texto, lo divide en artículos
 * y lo guarda en data/estatuto.json. También carga ese JSON al iniciar el servidor.
 */

const fs = require('fs');
const path = require('path');
const { parseEstatutoText } = require('./estatutoParser');

/** Descarga el PDF desde la URL oficial y lo guarda en disco. */
async function downloadPdf(url, destination) {
  // Algunos servidores web rechazan peticiones sin User-Agent.
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UASD-Estatuto-Chatbot/1.0)' },
  });
  if (!response.ok) throw new Error(`No se pudo descargar el PDF (HTTP ${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.slice(0, 4).toString() !== '%PDF') throw new Error('El archivo descargado no es un PDF válido');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, buffer);
  return buffer;
}

/**
 * Construye data/estatuto.json.
 * @param {{url: string, pdfFile: string, dataFile: string}} cfg
 * @param {string} [localPdf] Ruta a un PDF ya descargado (evita la descarga).
 */
async function buildEstatutoData(cfg, localPdf) {
  let buffer;
  if (localPdf) {
    buffer = fs.readFileSync(localPdf);
  } else if (fs.existsSync(cfg.pdfFile)) {
    buffer = fs.readFileSync(cfg.pdfFile);
  } else {
    console.log(`Descargando el Estatuto desde ${cfg.url} ...`);
    buffer = await downloadPdf(cfg.url, cfg.pdfFile);
  }

  // pdf-parse se carga aquí (y desde su archivo interno) para evitar su modo de depuración.
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const { text, numpages } = await pdfParse(buffer);
  const chunks = parseEstatutoText(text);
  if (chunks.length < 50) {
    throw new Error(`Solo se detectaron ${chunks.length} fragmentos; el PDF podría estar escaneado o tener otro formato.`);
  }

  const payload = {
    source: cfg.url,
    generatedAt: new Date().toISOString(),
    pages: numpages,
    chunks,
  };
  fs.mkdirSync(path.dirname(cfg.dataFile), { recursive: true });
  fs.writeFileSync(cfg.dataFile, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

/** Carga los fragmentos desde data/estatuto.json (o null si no existe). */
function loadEstatutoData(dataFile) {
  if (!fs.existsSync(dataFile)) return null;
  const payload = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  return Array.isArray(payload.chunks) ? payload : null;
}

module.exports = { buildEstatutoData, loadEstatutoData };
