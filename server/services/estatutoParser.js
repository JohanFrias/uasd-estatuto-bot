'use strict';

/**
 * Convierte el texto extraído del PDF del Estatuto Orgánico en "fragmentos"
 * (uno por artículo) listos para ser buscados por el chatbot.
 *
 * Cada fragmento conserva el capítulo al que pertenece para dar contexto:
 *   { id, article, chapter, chapterTitle, section, heading, text }
 */

const MAX_CHUNK_CHARS = 2400;

// Encabezados / pies de página que se repiten en cada hoja del PDF
const PAGE_NOISE = [
  /^Aprobado por el Claustro Mayor\s+\d+$/i, // "Aprobado por el Claustro Mayor 11"
  /^\d+\s+Estatuto Org[aá]nico\s*$/i, // "12 Estatuto Orgánico"
];

const CHAPTER_RE = /^CAP[IÍ]TULO\s+([IVXLCDM]+|\d+)\s*:?\s*$/i;
const ARTICLE_RE = /^ART[IÍ]CULO\s+(\d+)\b\s*(.*)$/; // en mayúsculas: el índice usa "Artículo" y no coincide
const ITEM_START_RE = /^(?:[A-Za-zñÑ]\)|P[aá]rrafo\b|Transitorio\b|\d+\.\s)/;

/** Quita ruido de página y une palabras cortadas por guion al final de línea. */
function cleanPdfText(raw) {
  const lines = String(raw || '')
    .replace(/\r/g, '')
    .replace(/ /g, ' ')
    .split('\n')
    .filter((line) => !PAGE_NOISE.some((re) => re.test(line.trim())));
  return lines.join('\n').replace(/(\p{L})-\n\s*(\p{L})/gu, '$1$2');
}

/** ¿La línea es un subtítulo en mayúsculas (p. ej. "MISIÓN, VISIÓN Y VALORES")? */
function isSectionLabel(line) {
  return line.length >= 6 && /[A-ZÁÉÍÓÚÑ]/.test(line) && !/[a-zñáéíóúü]/.test(line);
}

/** Une las líneas de un bloque en párrafos/literales (a), b), Párrafo...). */
function joinLines(lines) {
  const items = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (items.length === 0 || ITEM_START_RE.test(line)) items.push(line);
    else items[items.length - 1] += ' ' + line;
  }
  return items;
}

/** Divide un artículo muy largo en partes sin cortar literales por la mitad. */
function splitItems(items, maxChars = MAX_CHUNK_CHARS) {
  const parts = [];
  let current = [];
  let size = 0;
  for (const item of items) {
    if (size + item.length > maxChars && current.length) {
      parts.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.length + 1;
  }
  if (current.length) parts.push(current);
  return parts;
}

function makeChunks({ idBase, article, chapter, chapterTitle, section, heading, items }) {
  const parts = splitItems(items);
  return parts.map((part, i) => ({
    id: parts.length > 1 ? `${idBase}-p${i + 1}` : idBase,
    article,
    chapter,
    chapterTitle,
    section: section || '',
    heading: parts.length > 1 ? `${heading} (parte ${i + 1} de ${parts.length})` : heading,
    text: part.join('\n'),
  }));
}

/**
 * @param {string} rawText Texto completo del PDF (salida de pdf-parse).
 * @returns {Array} fragmentos del Estatuto (artículos + glosario)
 */
function parseEstatutoText(rawText) {
  const allLines = cleanPdfText(rawText).split('\n').map((l) => l.trim());

  // 1) El cuerpo empieza en "ARTÍCULO 1" (el índice usa "Artículo 1 ....11").
  const firstArticle = allLines.findIndex((l) => /^ART[IÍ]CULO\s+1\s*$/.test(l));
  if (firstArticle === -1) {
    throw new Error('No se encontró "ARTÍCULO 1" en el texto: ¿es el Estatuto Orgánico?');
  }
  let start = firstArticle;
  for (let i = firstArticle - 1; i >= Math.max(0, firstArticle - 8); i--) {
    if (CHAPTER_RE.test(allLines[i])) {
      start = i;
      break;
    }
  }

  // 2) El glosario va al final: "GLOSARIO" solo en su línea (el índice lleva puntos).
  let glossaryAt = -1;
  for (let i = allLines.length - 1; i > firstArticle; i--) {
    if (/^GLOSARIO\s*$/i.test(allLines[i])) {
      glossaryAt = i;
      break;
    }
  }
  const bodyLines = allLines.slice(start, glossaryAt === -1 ? undefined : glossaryAt);
  const glossaryLines = glossaryAt === -1 ? [] : allLines.slice(glossaryAt + 1);

  // 3) Recorrido línea a línea con una pequeña máquina de estados.
  const chunks = [];
  let chapter = '';
  let chapterTitle = '';
  let section = '';
  let collectingTitle = false;
  let titleLines = [];
  let current = null; // artículo en construcción

  const flush = () => {
    if (!current) return;
    const items = joinLines(current.lines);
    if (items.length) {
      chunks.push(
        ...makeChunks({
          idBase: `art-${current.number}`,
          article: current.number,
          chapter: current.chapter,
          chapterTitle: current.chapterTitle,
          section: current.section,
          heading: `Artículo ${current.number}`,
          items,
        })
      );
    }
    current = null;
  };

  for (const line of bodyLines) {
    const chapterMatch = line.match(CHAPTER_RE);
    if (chapterMatch) {
      flush();
      chapter = chapterMatch[1].toUpperCase();
      chapterTitle = '';
      section = '';
      titleLines = [];
      collectingTitle = true;
      continue;
    }

    const articleMatch = line.match(ARTICLE_RE);
    if (articleMatch) {
      if (collectingTitle) {
        chapterTitle = titleLines.join(' ').replace(/\s+/g, ' ').trim();
        collectingTitle = false;
      }
      flush();
      current = {
        number: Number(articleMatch[1]),
        chapter,
        chapterTitle,
        section,
        lines: articleMatch[2] ? [articleMatch[2]] : [],
      };
      continue;
    }

    if (collectingTitle) {
      // El título del capítulo ocupa hasta 4 líneas antes del primer artículo.
      if (line && titleLines.length < 4) titleLines.push(line);
      continue;
    }

    if (isSectionLabel(line)) {
      section = line;
      continue;
    }

    if (current) current.lines.push(line);
  }
  flush();

  // 4) Glosario: se agrupa por párrafos para que cada fragmento sea manejable.
  const glossaryItems = joinLines(glossaryLines);
  const glossaryParts = splitItems(glossaryItems, 1500);
  glossaryParts.forEach((part, i) => {
    chunks.push({
      id: `glosario-${i + 1}`,
      article: null,
      chapter: '',
      chapterTitle: 'Glosario',
      section: '',
      heading: `Glosario (parte ${i + 1} de ${glossaryParts.length})`,
      text: part.join('\n'),
    });
  });

  return chunks;
}

module.exports = { parseEstatutoText, cleanPdfText };
