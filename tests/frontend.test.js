'use strict';

/** Pruebas de la lógica del frontend que no depende del navegador. */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const load = (rel) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', rel)).href);

// Las 35 preguntas que exige el enunciado del proyecto.
const REQUIRED_QUESTIONS = [
  '¿Qué es la Universidad Autónoma de Santo Domingo?',
  '¿Cuál es la misión de la UASD?',
  '¿Cuáles son los fines de la Universidad?',
  '¿Cuáles son las funciones fundamentales de la UASD?',
  '¿Qué establece el Estatuto sobre la autonomía universitaria?',
  '¿Cuáles son los principios que orientan a la Universidad?',
  '¿Cómo está organizada la Universidad?',
  '¿Cuáles son los organismos de gobierno de la UASD?',
  '¿Qué es el Claustro Mayor?',
  '¿Qué es el Claustro Menor?',
  '¿Qué es el Consejo Universitario?',
  '¿Quiénes integran el Consejo Universitario?',
  '¿Cuáles son las atribuciones del Consejo Universitario?',
  '¿Cuáles son las funciones del Rector?',
  '¿Cuáles son las funciones de los Vicerrectores?',
  '¿Qué son las Facultades?',
  '¿Cómo se organizan las Facultades?',
  '¿Qué son los Consejos Directivos de Facultad?',
  '¿Cuáles son las funciones de los Decanos?',
  '¿Qué son las Escuelas?',
  '¿Cuáles son las funciones de los Directores de Escuela?',
  '¿Qué establece el Estatuto sobre los Recintos, Centros y Subcentros Universitarios?',
  '¿Qué establece el Estatuto sobre el personal docente?',
  '¿Cuáles son los derechos del personal docente?',
  '¿Cuáles son los deberes del personal docente?',
  '¿Qué establece el Estatuto sobre los estudiantes?',
  '¿Cuáles son los derechos de los estudiantes?',
  '¿Cuáles son los deberes de los estudiantes?',
  '¿Qué establece el Estatuto sobre la representación estudiantil?',
  '¿Qué establece el Estatuto sobre la investigación?',
  '¿Qué establece el Estatuto sobre el postgrado?',
  '¿Qué establece el Estatuto sobre la extensión universitaria?',
  '¿Qué establece el Estatuto sobre el bienestar universitario?',
  '¿Qué establece el Estatuto sobre el régimen disciplinario?',
  '¿Qué establece el Estatuto sobre el patrimonio universitario?',
];

test('las preguntas sugeridas incluyen exactamente las 35 del enunciado, sin repetir', async () => {
  const { SUGGESTION_GROUPS, QUICK_QUESTIONS } = await load('data/suggestions.js');
  const all = SUGGESTION_GROUPS.flatMap((g) => g.questions);
  assert.equal(all.length, REQUIRED_QUESTIONS.length);
  assert.equal(new Set(all).size, all.length, 'hay preguntas repetidas');
  assert.deepEqual([...all].sort(), [...REQUIRED_QUESTIONS].sort());
  for (const q of QUICK_QUESTIONS) assert.ok(all.includes(q), `pregunta rápida desconocida: ${q}`);
});

test('renderRichText escapa HTML y evita inyección de código', async () => {
  const { renderRichText } = await load('utils/richText.js');
  const html = renderRichText('<img src=x onerror="alert(1)"> y <script>alert(2)</script> **ok**');
  assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /&lt;img/);
  assert.match(html, /<strong>ok<\/strong>/);
});

test('renderRichText da formato a listas y citas de artículos', async () => {
  const { renderRichText } = await load('utils/richText.js');
  const html = renderRichText('Atribuciones:\n- Aprobar planes (Art. 34)\n- Fijar tarifas (Arts. 34 y 35)\n\nFin.');
  assert.match(html, /<p>Atribuciones:<\/p>/);
  assert.match(html, /<ul><li>Aprobar planes <span class="cite">Art\. 34<\/span><\/li>/);
  assert.match(html, /<span class="cite">Arts\. 34 y 35<\/span>/);
  assert.match(html, /<p>Fin\.<\/p>/);
});
