'use strict';

/**
 * Lógica principal del chatbot (independiente de Express para poder probarla).
 *
 * Flujo:
 *  1. Validar la entrada.
 *  2. Buscar los fragmentos relevantes del Estatuto.
 *  3. Si no hay información suficiente -> responder que no se sabe (sin llamar a la IA).
 *  4. Si la hay -> pedir a la IA una respuesta basada SOLO en esos fragmentos.
 *  5. Guardar la conversación en MySQL (si está disponible).
 */

const { HttpError } = require('../utils/errors');
const { tokenize } = require('../utils/text');
const { NO_INFO_PREFIX, extractiveAnswer } = require('./ai');

const NO_INFO_MESSAGE =
  `${NO_INFO_PREFIX} para responder esa pregunta. ` +
  'Intenta reformularla con otras palabras o elige una de las preguntas sugeridas.';

const CLIENT_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/** Valida y normaliza el cuerpo de la petición. */
function validateInput(body, { maxMessageLength }) {
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) throw new HttpError(400, 'Escribe una pregunta para poder ayudarte.');
  if (message.length > maxMessageLength) {
    throw new HttpError(400, `La pregunta es demasiado larga (máximo ${maxMessageLength} caracteres).`);
  }
  const clientId = body?.clientId;
  if (typeof clientId !== 'string' || !CLIENT_ID_RE.test(clientId)) {
    throw new HttpError(400, 'Identificador de cliente inválido.');
  }
  let conversationId = null;
  if (body.conversationId != null && body.conversationId !== '') {
    conversationId = Number(body.conversationId);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      throw new HttpError(400, 'Identificador de conversación inválido.');
    }
  }
  return {
    message,
    clientId,
    conversationId,
    history: Array.isArray(body.history) ? body.history : [],
    preferExtractive: body.preferExtractive === true,
  };
}

/**
 * Preguntas de seguimiento muy cortas ("¿y sus funciones?") se enriquecen con la
 * pregunta anterior del usuario para que el buscador tenga contexto.
 */
function buildSearchQuery(message, history) {
  if (tokenize(message).length >= 3) return message;
  const lastUser = [...history].reverse().find((m) => m?.role === 'user' && typeof m.content === 'string');
  return lastUser ? `${lastUser.content} ${message}` : message;
}

/** Números de artículo citados en la respuesta: "(Art. 34)", "Arts. 26 y 27", "Artículo 5". */
function citedArticles(answer) {
  const found = new Set();
  const re = /\bArt(?:s?\.|[íi]culos?)\s*((?:\d+\s*(?:,|y|e|a|al|-)?\s*)+)/gi;
  let m;
  while ((m = re.exec(answer))) {
    for (const n of m[1].match(/\d+/g) || []) found.add(Number(n));
  }
  return found;
}

/** Fuentes que se muestran al usuario: los artículos citados, o los 3 más relevantes. */
function pickSources(answer, items) {
  if (answer.startsWith(NO_INFO_PREFIX)) return [];
  const cited = citedArticles(answer);
  let chosen = items.filter(({ chunk }) => chunk.article != null && cited.has(chunk.article));
  if (!chosen.length) chosen = items.slice(0, 3);

  const seen = new Set();
  const sources = [];
  for (const { chunk } of chosen) {
    const key = chunk.article ?? chunk.id;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      article: chunk.article,
      label: chunk.article != null ? `Artículo ${chunk.article}` : 'Glosario',
      chapter: chunk.chapter ? `Capítulo ${chunk.chapter}` : '',
      chapterTitle: chunk.chapterTitle || '',
    });
  }
  return sources;
}

/**
 * @param {object} body Cuerpo de la petición HTTP.
 * @param {{retriever: object, ai: object, db: object|null, config: object}} deps
 */
async function handleChat(body, { retriever, ai, db, config }) {
  const { message, clientId, conversationId, history, preferExtractive } = validateInput(body, config.limits);

  if (!retriever || retriever.size === 0) {
    throw new HttpError(
      503,
      'El Estatuto aún no ha sido cargado. El administrador debe ejecutar "npm run build:data".'
    );
  }

  // 1) Búsqueda
  const search = retriever.search(buildSearchQuery(message, history), { topK: config.retrieval.topK });

  // 2) Respuesta
  let answer;
  let mode;
  let sources = [];
  if (!search.relevant) {
    answer = NO_INFO_MESSAGE;
    mode = 'no-context';
  } else if (preferExtractive) {
    answer = extractiveAnswer(search.items);
    mode = 'extractive';
  } else {
    const result = await ai.generateAnswer({
      question: message,
      items: search.items,
      history,
      config: config.ai || config.openai,
    });
    answer = result.answer;
    mode = result.mode;
    sources = pickSources(answer, search.items);
  }

  // 3) Historial en MySQL (un fallo aquí no debe impedir que el usuario reciba su respuesta)
  let savedConversationId = null;
  if (db && db.isAvailable()) {
    try {
      savedConversationId = conversationId;
      if (savedConversationId && !(await db.ownsConversation(savedConversationId, clientId))) {
        savedConversationId = null;
      }
      if (!savedConversationId) {
        savedConversationId = await db.createConversation(clientId, message.slice(0, 80));
      }
      await db.addMessages(savedConversationId, [
        { role: 'user', content: message },
        { role: 'assistant', content: answer, sources },
      ]);
    } catch (err) {
      console.error('[db] No se pudo guardar la conversación:', err.message);
      savedConversationId = null;
    }
  }

  return { conversationId: savedConversationId, answer, sources, mode };
}

module.exports = {
  handleChat,
  validateInput,
  buildSearchQuery,
  citedArticles,
  pickSources,
  NO_INFO_MESSAGE,
};
