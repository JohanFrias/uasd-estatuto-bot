'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { HttpError } = require('../utils/errors');
const chatService = require('../services/chatService');

/**
 * Rutas de la API.
 * @param {{retriever: object, ai: object, db: object}} deps Dependencias inyectadas.
 */
function createApiRouter(deps) {
  const router = express.Router();

  // Limita las consultas por IP para proteger el uso de la API de IA.
  const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.limits.rateLimitPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas consultas seguidas. Espera un minuto e inténtalo de nuevo.' },
  });

  const requireClientId = (req) => {
    const clientId = req.query.clientId;
    if (typeof clientId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(clientId)) {
      throw new HttpError(400, 'Identificador de cliente inválido.');
    }
    return clientId;
  };
  const requireDb = () => {
    if (!deps.db.isAvailable()) throw new HttpError(503, 'El historial guardado no está disponible.');
  };
  const parseId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Identificador de conversación inválido.');
    return id;
  };

  // Estado del sistema (lo usa la interfaz para mostrar avisos)
  router.get('/health', (req, res) => {
    res.json({
      ok: true,
      ai: Boolean(config.ai.apiKey),
      db: deps.db.isAvailable(),
      fragments: deps.retriever ? deps.retriever.size : 0,
    });
  });

  // Enviar una pregunta
  router.post('/chat', chatLimiter, async (req, res, next) => {
    try {
      const result = await chatService.handleChat(req.body, { ...deps, config });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Historial: listar, abrir y borrar conversaciones
  router.get('/conversations', async (req, res, next) => {
    try {
      const clientId = requireClientId(req);
      if (!deps.db.isAvailable()) return res.json({ available: false, conversations: [] });
      res.json({ available: true, conversations: await deps.db.listConversations(clientId) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/conversations/:id', async (req, res, next) => {
    try {
      const clientId = requireClientId(req);
      requireDb();
      const conversation = await deps.db.getConversation(parseId(req.params.id), clientId);
      if (!conversation) throw new HttpError(404, 'Conversación no encontrada.');
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/conversations/:id', async (req, res, next) => {
    try {
      const clientId = requireClientId(req);
      requireDb();
      const deleted = await deps.db.deleteConversation(parseId(req.params.id), clientId);
      if (!deleted) throw new HttpError(404, 'Conversación no encontrada.');
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createApiRouter };
