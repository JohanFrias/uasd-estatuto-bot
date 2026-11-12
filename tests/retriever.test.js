'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseEstatutoText } = require('../server/services/estatutoParser');
const { Retriever } = require('../server/services/retriever');

const raw = fs.readFileSync(path.join(__dirname, 'fixtures', 'estatuto-sample.txt'), 'utf8');
const retriever = new Retriever(parseEstatutoText(raw), { minCoverage: 0.5, minScore: 2.0 });

/** Artículos devueltos (en orden) para una pregunta. */
const articlesFor = (q) => retriever.search(q).items.map((i) => i.chunk.article);

// Pregunta -> artículo que debe aparecer de primero.
const EXPECTED_TOP = [
  ['¿Qué es el Claustro Mayor?', 26],
  ['¿Qué es el Claustro Menor?', 29],
  ['¿Quiénes integran el Consejo Universitario?', 32],
  ['¿Cuáles son las atribuciones del Consejo Universitario?', 34],
  ['¿Cuáles son las funciones del Rector?', 38],
  ['¿Cuáles son las funciones de los Vicerrectores?', 40],
  ['¿Cuáles son los derechos de los estudiantes?', 100],
  ['¿Cuáles son los deberes de los estudiantes?', 101],
  ['¿Cuál es la misión de la UASD?', 7],
  ['¿Cuáles son los fines de la Universidad?', 10],
  ['¿Cuáles son los principios que orientan a la Universidad?', 9],
  ['¿Qué establece el Estatuto sobre el patrimonio universitario?', 111],
];

for (const [question, article] of EXPECTED_TOP) {
  test(`"${question}" -> Artículo ${article}`, () => {
    const result = retriever.search(question);
    assert.equal(result.relevant, true, 'debería considerarse relevante');
    assert.equal(result.items[0].chunk.article, article, `se obtuvo: ${articlesFor(question)}`);
  });
}

test('temas que el Estatuto reparte en varios artículos devuelven todos los relevantes', () => {
  // El régimen disciplinario aparece en el Art. 34 (reglamentarlo) y en el Art. 102 (sanciones).
  const result = retriever.search('¿Qué establece el Estatuto sobre el régimen disciplinario?');
  assert.equal(result.relevant, true);
  const articles = result.items.map((i) => i.chunk.article);
  assert.ok(articles.includes(34) && articles.includes(102), `se obtuvo: ${articles}`);
});

test('una referencia directa a un artículo lo devuelve primero', () => {
  const result = retriever.search('Explícame el artículo 38');
  assert.equal(result.relevant, true);
  assert.equal(result.items[0].chunk.article, 38);
  assert.deepEqual([...Retriever.explicitArticles('arts. 26 y 29')].sort(), [26, 29]);
});

test('preguntas ajenas al Estatuto NO se consideran relevantes', () => {
  for (const q of [
    '¿Cuál es la capital de Francia?',
    '¿Quién ganó el mundial de fútbol?',
    'Dame una receta de sancocho',
    'hola',
    '¿Cuál es el horario de la biblioteca?',
    '¿Cuál es el mejor equipo de béisbol del mundo?',
  ]) {
    assert.equal(retriever.search(q).relevant, false, `"${q}" no debería ser relevante`);
  }
});

test('ignora tildes, mayúsculas y plurales', () => {
  const top3 = (q) => retriever.search(q).items.slice(0, 3).map((i) => i.chunk.article);
  assert.ok(top3('CLAUSTRO MENOR').includes(29), `se obtuvo: ${top3('CLAUSTRO MENOR')}`);
  assert.deepEqual(top3('claustro menor'), top3('Claustro Menor'));
  assert.equal(retriever.search('decanos y vicerrectores').relevant, true);
});
