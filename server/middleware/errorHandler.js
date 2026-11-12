'use strict';

const { HttpError, AiError } = require('../utils/errors');

/** Mensajes amigables para cada tipo de fallo de la IA. */
const AI_MESSAGES = {
  auth: [500, 'La clave de la API de IA no es válida o no tiene permisos. Revisa la clave configurada en el servidor.'],
  billing: [503, 'La cuenta del proveedor de IA no tiene crédito o cuota disponible. Revisa la facturación y los límites del proyecto asociado a la clave.'],
  rate_limit: [429, 'La IA recibió demasiadas consultas. Espera unos segundos e inténtalo de nuevo.'],
  overloaded: [503, 'El servicio de IA está ocupado en este momento. Inténtalo de nuevo en un momento.'],
  timeout: [504, 'La IA tardó demasiado en responder. Inténtalo de nuevo.'],
  network: [502, 'No se pudo conectar con el servicio de IA. Verifica la conexión a internet del servidor.'],
  bad_request: [502, 'La IA no pudo procesar la consulta. Revisa el modelo configurado para el proveedor.'],
  empty: [502, 'La IA no generó una respuesta. Intenta reformular la pregunta.'],
};

/** Respuesta 404 para rutas /api desconocidas. */
function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

/** Manejador central de errores: nunca expone detalles internos al usuario. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof AiError) {
    console.error(`[ai] ${err.kind}: ${err.message}`);
    const [status, message] = AI_MESSAGES[err.kind] || [502, 'Error al consultar la IA.'];
    return res.status(status).json({ error: message });
  }
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ error: 'La petición no es válida.' });
  }
  console.error('[error]', err);
  return res.status(500).json({ error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
}

module.exports = { errorHandler, notFound };
