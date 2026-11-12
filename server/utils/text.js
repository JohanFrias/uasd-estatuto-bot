'use strict';

/**
 * Utilidades de procesamiento de lenguaje natural para español.
 * Se usan tanto al indexar el Estatuto como al interpretar la pregunta del usuario.
 */

// Palabras muy frecuentes que no aportan significado a la búsqueda.
// (ya están sin tildes porque se comparan después de normalizar)
const STOPWORDS = new Set(
  `de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este
   si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante
   todos uno les ni contra otros ese eso ante ellos e esto mi antes algunos unos yo otro otras otra
   tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros es son
   ser fue ha han sea cada cuales cuanto cuantos cuantas puede pueden debe deben hacer tiene tienen
   estatuto organico establece establecen dice indica indican segun uasd existe existen
   favor explicame dime podrias puedes hola gracias`
    .split(/\s+/)
    .filter(Boolean)
);

/** Minúsculas, sin tildes ni signos; unifica "postgrado" con "posgrado". */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // quita tildes (ñ -> n)
    .replace(/postgrad/g, 'posgrad')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Raíz muy simple: quita plurales y recorta a 6 letras (decano/decanos -> "decano"). */
function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s')) w = w.slice(0, -1);
  return w.length > 6 ? w.slice(0, 6) : w;
}

/** Convierte un texto en una lista de raíces sin palabras vacías. */
function tokenize(text, { keepStopwords = false } = {}) {
  const tokens = [];
  for (const word of normalize(text).split(' ')) {
    if (!word) continue;
    if (!keepStopwords && (STOPWORDS.has(word) || word.length < 2)) continue;
    tokens.push(stem(word));
  }
  return tokens;
}

module.exports = { normalize, stem, tokenize, STOPWORDS };
