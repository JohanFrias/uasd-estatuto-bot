'use strict';

/**
 * Búsqueda inteligente dentro del Estatuto.
 *
 * Usa BM25 (algoritmo clásico de recuperación de información) sobre los
 * fragmentos del Estatuto, con:
 *  - normalización del español (tildes, plurales, palabras vacías),
 *  - expansión semántica con sinónimos del dominio,
 *  - refuerzo por título de capítulo,
 *  - detección de referencias directas ("artículo 38").
 *
 * Devuelve los fragmentos más relevantes y una bandera `relevant` que indica
 * si realmente hay información para responder (evita respuestas inventadas).
 */

const { tokenize, normalize } = require('../utils/text');
const { expand } = require('../utils/synonyms');

const K1 = 1.5;
const B = 0.75;
const EXPANDED_WEIGHT = 0.5; // los sinónimos pesan la mitad que las palabras originales
const ARTICLE_BOOST = 100; // "artículo 38" en la pregunta
const DEFINITION_BOOST = 4; // "¿Qué es X?" y el texto dice "X es ..."
const LEAD_BOOST = 2.5; // la primera frase del artículo ("Son deberes de los estudiantes:") coincide con la pregunta

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class Retriever {
  /**
   * @param {Array} chunks Fragmentos generados por estatutoParser.
   * @param {{minCoverage?: number, minScore?: number}} options
   */
  constructor(chunks, { minCoverage = 0.5, minScore = 2.0 } = {}) {
    this.chunks = chunks;
    this.minCoverage = minCoverage;
    this.minScore = minScore;

    // Indexación: frecuencia de cada término por fragmento (tf) y en cuántos aparece (df).
    this.docs = chunks.map((chunk) => {
      const headerText = `${chunk.chapterTitle} ${chunk.section} ${chunk.heading}`;
      // El título del capítulo se repite dos veces para darle más peso.
      const tokens = [...tokenize(chunk.text), ...tokenize(headerText), ...tokenize(headerText)];
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      return {
        tf,
        length: tokens.length || 1,
        // Primera frase del artículo: suele nombrar el tema ("Son atribuciones del Rector:")
        lead: new Set(tokenize(chunk.text.split('\n')[0].slice(0, 220))),
        // Texto normalizado, para detectar definiciones ("el claustro mayor es ...")
        normalized: normalize(chunk.text),
      };
    });

    this.df = new Map();
    for (const { tf } of this.docs) {
      for (const term of tf.keys()) this.df.set(term, (this.df.get(term) || 0) + 1);
    }
    const totalLength = this.docs.reduce((sum, d) => sum + d.length, 0);
    this.avgLength = this.docs.length ? totalLength / this.docs.length : 1;
  }

  get size() {
    return this.chunks.length;
  }

  idf(term) {
    const n = this.docs.length;
    const df = this.df.get(term) || 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  /** Extrae números de artículo mencionados: "artículo 38", "art. 26 y 27", "arts. 5, 6". */
  static explicitArticles(query) {
    const found = new Set();
    const text = normalize(query);
    const re = /\bart(?:s|iculos?)?\s*((?:\d+\s*(?:y|e)?\s*)+)/g;
    let m;
    while ((m = re.exec(text))) {
      for (const num of m[1].match(/\d+/g) || []) found.add(Number(num));
    }
    return found;
  }

  /** "¿Qué es el Claustro Mayor?" -> "claustro mayor" (cadena vacía si no es una definición). */
  static definitionSubject(query) {
    const m = normalize(query).match(/^(?:que|cual) (?:es|son|significa|significan) (?:(?:el|la|los|las|un|una) )?(.+)$/);
    return m ? m[1].trim() : '';
  }

  /**
   * @param {string} query Pregunta del usuario (ya combinada con contexto si aplica).
   * @param {{topK?: number}} options
   * @returns {{items: Array<{chunk: object, score: number, coverage: number}>, relevant: boolean}}
   */
  search(query, { topK = 5 } = {}) {
    const baseTerms = [...new Set(tokenize(query))];
    const explicit = Retriever.explicitArticles(query);

    // Pesos: términos originales = 1, sinónimos = 0.5
    const weights = new Map(baseTerms.map((t) => [t, 1]));
    for (const term of baseTerms) {
      for (const related of expand(term)) {
        if (!weights.has(related)) weights.set(related, EXPANDED_WEIGHT);
      }
    }

    if (!weights.size && !explicit.size) return { items: [], relevant: false };

    // Para medir cobertura se ignoran los términos presentes en más de la mitad de los
    // fragmentos (p. ej. "universidad"): coinciden con casi todo y no indican relevancia.
    const informative = baseTerms.filter((t) => (this.df.get(t) || 0) / this.docs.length <= 0.5);
    const coverageTerms = informative.length ? informative : baseTerms;

    const subject = Retriever.definitionSubject(query);
    const definitionRe = subject ? new RegExp(`\\b${escapeRegex(subject)} (?:es|son|esta|estan)\\b`) : null;

    const scored = this.chunks.map((chunk, i) => {
      const { tf, length, lead, normalized } = this.docs[i];
      let score = 0;
      for (const [term, weight] of weights) {
        const freq = tf.get(term);
        if (!freq) continue;
        const norm = freq * (K1 + 1) / (freq + K1 * (1 - B + (B * length) / this.avgLength));
        score += weight * this.idf(term) * norm;
      }
      const matched = coverageTerms.filter((t) => tf.has(t)).length;
      const coverage = coverageTerms.length ? matched / coverageTerms.length : 0;

      // Refuerzos: la primera frase del artículo nombra el tema / el artículo define el término.
      if (score > 0) {
        const leadCoverage = baseTerms.length ? baseTerms.filter((t) => lead.has(t)).length / baseTerms.length : 0;
        if (leadCoverage >= 0.66) score += LEAD_BOOST * leadCoverage;
        if (definitionRe && definitionRe.test(normalized)) score += DEFINITION_BOOST;
      }

      const isExplicit = chunk.article != null && explicit.has(chunk.article);
      if (isExplicit) score += ARTICLE_BOOST;
      return { chunk, score, coverage, isExplicit };
    });

    const items = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const top = items[0];
    const relevant = Boolean(
      top && (top.isExplicit || (top.coverage >= this.minCoverage && top.score >= this.minScore))
    );

    return { items, relevant };
  }
}

module.exports = { Retriever };
