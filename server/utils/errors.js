'use strict';

/** Error con código HTTP y mensaje seguro para mostrar al usuario. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Error de la API de IA. `kind` permite decidir qué mensaje mostrar. */
class AiError extends Error {
  constructor(kind, message, status) {
    super(message);
    this.name = 'AiError';
    this.kind = kind; // auth | billing | rate_limit | overloaded | bad_request | timeout | network | empty
    this.status = status;
  }
}

module.exports = { HttpError, AiError };
