'use strict';

function createCorsMiddleware(allowedOrigins) {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.get('Origin');
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.vary('Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  };
}

module.exports = { createCorsMiddleware };
