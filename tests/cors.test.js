'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCorsMiddleware } = require('../server/middleware/cors');

function runMiddleware(origin, method = 'GET') {
  const headers = {};
  const res = {
    setHeader: (name, value) => { headers[name] = value; },
    vary: (value) => { headers.Vary = value; },
    sendStatus: (status) => { headers.status = status; },
  };
  let continued = false;
  const req = { get: () => origin, method };
  createCorsMiddleware(['https://johanfrias.github.io'])(req, res, () => { continued = true; });
  return { headers, continued };
}

test('CORS permite la interfaz de GitHub Pages y responde al preflight', () => {
  const { headers, continued } = runMiddleware('https://johanfrias.github.io', 'OPTIONS');
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://johanfrias.github.io');
  assert.equal(headers['Access-Control-Allow-Methods'], 'GET, POST, DELETE, OPTIONS');
  assert.equal(headers.status, 204);
  assert.equal(continued, false);
});

test('CORS no concede acceso a otros orígenes', () => {
  const { headers, continued } = runMiddleware('https://otro-sitio.example');
  assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  assert.equal(continued, true);
});
