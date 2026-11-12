/**
 * Comunicación con el servidor (API del chatbot).
 * Todas las funciones lanzan ApiError con un mensaje listo para mostrar al usuario.
 */

import { API_BASE_URL } from './config.js';

const apiBaseUrl = API_BASE_URL.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, timeout = 45000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${apiBaseUrl}/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* respuesta sin JSON */
    }
    if (!res.ok) throw new ApiError(data?.error || `Error del servidor (${res.status}).`, res.status);
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw new ApiError('La consulta tardó demasiado. Inténtalo de nuevo.', 408);
    throw new ApiError('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.');
  } finally {
    clearTimeout(timer);
  }
}

const q = (clientId) => `clientId=${encodeURIComponent(clientId)}`;

export const api = {
  health: () => request('/health', { timeout: 8000 }),
  chat: (payload) => request('/chat', { method: 'POST', body: payload }),
  listConversations: (clientId) => request(`/conversations?${q(clientId)}`, { timeout: 10000 }),
  getConversation: (id, clientId) => request(`/conversations/${id}?${q(clientId)}`, { timeout: 10000 }),
  deleteConversation: (id, clientId) => request(`/conversations/${id}?${q(clientId)}`, { method: 'DELETE', timeout: 10000 }),
};
