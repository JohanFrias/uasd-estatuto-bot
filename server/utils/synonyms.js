'use strict';

/**
 * Expansión semántica ligera de consultas.
 *
 * El usuario puede preguntar con palabras distintas a las que usa el Estatuto
 * (por ejemplo "fines" -> el Estatuto dice "las actividades deben dirigirse hacia").
 * Cada clave es una raíz (ver utils/text.js#stem) y su lista son términos
 * relacionados que se agregan a la búsqueda con menor peso.
 *
 * Para que sea fácil de mantener, las claves se escriben como palabras normales
 * y se convierten a raíz al cargar el módulo.
 */
const { tokenize } = require('./text');

const RAW = {
  fines: ['actividades dirigirse hacia metas'],
  fundamentales: ['docencia investigacion extension'],
  principios: ['valores criterios espiritu'],
  organizada: ['estructura compuesta'],
  organizacion: ['estructura compuesta'],
  gobierno: ['colegiados unipersonales estructura'],
  funciones: ['atribuciones'],
  atribuciones: ['funciones'],
  integran: ['componen constituido conformado miembros'],
  integrantes: ['componen constituido conformado miembros'],
  integrado: ['componen constituido conformado miembros'],
  docente: ['profesor academico carrera'],
  docentes: ['profesor academico carrera'],
  profesores: ['personal academico carrera'],
  disciplinario: ['sanciones sancionar faltas'],
  patrimonio: ['bienes ingresos propiedad'],
  autonomia: ['autonomo fuero'],
  mision: ['misión contribuir'],
  claustros: ['claustro mayor menor'],
  representacion: ['representantes delegados cogobierno'],
  estudiantil: ['estudiantes delegados'],
  extension: ['extensionista servicio comunitario'],
  investigacion: ['investigadores cientifica'],
  posgrado: ['cuarto nivel'],
};

// raíz -> [raíces relacionadas]
const SYNONYMS = new Map();
for (const [key, values] of Object.entries(RAW)) {
  const [keyStem] = tokenize(key, { keepStopwords: true });
  const related = values.flatMap((v) => tokenize(v));
  if (keyStem) SYNONYMS.set(keyStem, [...new Set([...(SYNONYMS.get(keyStem) || []), ...related])]);
}

/** Devuelve las raíces relacionadas con una raíz dada. */
function expand(stemmed) {
  return SYNONYMS.get(stemmed) || [];
}

module.exports = { expand };
