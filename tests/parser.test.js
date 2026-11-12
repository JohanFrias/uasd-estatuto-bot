'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseEstatutoText } = require('../server/services/estatutoParser');

const raw = fs.readFileSync(path.join(__dirname, 'fixtures', 'estatuto-sample.txt'), 'utf8');
const chunks = parseEstatutoText(raw);
const byArticle = (n) => chunks.find((c) => c.article === n);

test('ignora el índice y la presentación: el primer fragmento es el Artículo 1', () => {
  assert.equal(chunks[0].article, 1);
  assert.equal(chunks.filter((c) => c.article === 1).length, 1);
});

test('detecta el capítulo y su título (en varias líneas)', () => {
  assert.equal(byArticle(1).chapter, '1');
  assert.match(byArticle(1).chapterTitle, /De la Universidad/);
  assert.equal(byArticle(26).chapter, 'IV');
  assert.equal(byArticle(26).chapterTitle, 'Del Claustro Universitario');
  assert.equal(byArticle(38).chapterTitle, 'De la Rectoría');
  assert.equal(byArticle(39).chapter, 'VII'); // "Capítulo VII:" con dos puntos
  assert.equal(byArticle(111).chapterTitle, 'De los bienes e ingresos de la Universidad');
});

test('une palabras cortadas por guion al final de línea', () => {
  assert.match(byArticle(1).text, /Pontificia Universidad de Santo Domingo/);
  assert.match(byArticle(2).text, /dar cumplimiento a la misión/); // "cumpli-\nmiento"
  assert.match(byArticle(6).text, /rigurosamente científica/);
});

test('elimina encabezados y pies de página', () => {
  for (const c of chunks) {
    assert.doesNotMatch(c.text, /Aprobado por el Claustro Mayor\s+\d+/);
    assert.doesNotMatch(c.text, /^\d+\s+Estatuto Orgánico/m);
  }
});

test('separa la lista de literales y los párrafos en líneas propias', () => {
  const lines = byArticle(7).text.split('\n');
  assert.equal(lines[0], 'Es misión de la Universidad:');
  assert.ok(lines[1].startsWith('a) contribuir'));
  assert.ok(lines[2].startsWith('b) buscar la verdad'));
  assert.ok(byArticle(26).text.split('\n').some((l) => l.startsWith('Párrafo I.-')));
  assert.ok(byArticle(100).text.split('\n').some((l) => l.startsWith('c)derecho')));
});

test('el subtítulo en mayúsculas no se mezcla con el texto del artículo anterior', () => {
  assert.doesNotMatch(byArticle(6).text, /MISIÓN, VISIÓN Y VALORES/);
  assert.equal(byArticle(7).section, 'MISIÓN, VISIÓN Y VALORES');
});

test('el glosario se separa de los artículos', () => {
  const glossary = chunks.filter((c) => c.article === null);
  assert.ok(glossary.length >= 1);
  assert.match(glossary[0].text, /Autonomía universitaria/);
  assert.doesNotMatch(byArticle(114).text, /Autonomía universitaria/);
});

test('falla con un mensaje claro si el texto no es el Estatuto', () => {
  assert.throws(() => parseEstatutoText('Texto cualquiera sin artículos'), /ARTÍCULO 1/);
});
