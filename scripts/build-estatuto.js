#!/usr/bin/env node
'use strict';

/**
 * Prepara la base de conocimiento del chatbot:
 *   npm run build:data                 -> descarga el PDF oficial y lo procesa
 *   npm run build:data -- ruta/al.pdf  -> usa un PDF que ya tengas descargado
 *
 * Resultado: data/estatuto.json (un fragmento por artículo + glosario).
 */

const config = require('../server/config');
const { buildEstatutoData } = require('../server/services/estatutoStore');

(async () => {
  try {
    const localPdf = process.argv[2];
    const payload = await buildEstatutoData(config.estatuto, localPdf);
    const articles = new Set(payload.chunks.map((c) => c.article).filter((a) => a != null));
    console.log(`✔ Estatuto procesado: ${payload.chunks.length} fragmentos, ${articles.size} artículos, ${payload.pages} páginas.`);
    console.log(`  Guardado en ${config.estatuto.dataFile}`);
  } catch (err) {
    console.error(`✖ No se pudo preparar el Estatuto: ${err.message}`);
    console.error('  Descarga el PDF manualmente y ejecuta: npm run build:data -- ruta/al/ESTATUTO-ORGANICO-UASD.pdf');
    process.exit(1);
  }
})();
