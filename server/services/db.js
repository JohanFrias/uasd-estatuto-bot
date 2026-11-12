'use strict';

/**
 * Acceso a MySQL para guardar el historial de conversaciones.
 *
 * La base de datos es OPCIONAL: si MySQL no está disponible el chatbot sigue
 * funcionando (solo se desactiva el historial guardado).
 */

const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;
let available = false;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS conversations (
     id INT UNSIGNED NOT NULL AUTO_INCREMENT,
     client_id VARCHAR(64) NOT NULL,
     title VARCHAR(120) NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     INDEX idx_client_updated (client_id, updated_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS messages (
     id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
     conversation_id INT UNSIGNED NOT NULL,
     role ENUM('user','assistant') NOT NULL,
     content TEXT NOT NULL,
     sources TEXT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     INDEX idx_conversation (conversation_id, id),
     CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id)
       REFERENCES conversations (id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/** Conecta, crea la base y las tablas si no existen. Nunca lanza: devuelve true/false. */
async function init() {
  if (!config.db.enabled) {
    console.log('[db] Desactivada (DB_ENABLED=false). El historial guardado no estará disponible.');
    return false;
  }
  if (!/^[A-Za-z0-9_]+$/.test(config.db.name)) {
    console.warn('[db] DB_NAME inválido: solo letras, números y guion bajo.');
    return false;
  }
  try {
    const { host, port, user, password, name } = config.db;
    const bootstrap = await mysql.createConnection({ host, port, user, password });
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await bootstrap.end();

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: name,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
    });
    for (const sql of SCHEMA) await pool.query(sql);
    available = true;
    console.log(`[db] MySQL conectado (base "${name}").`);
  } catch (err) {
    available = false;
    console.warn(`[db] No se pudo usar MySQL (${err.code || err.message}). El chatbot funcionará sin historial guardado.`);
  }
  return available;
}

const isAvailable = () => available;

async function createConversation(clientId, title) {
  const [result] = await pool.execute('INSERT INTO conversations (client_id, title) VALUES (?, ?)', [clientId, title]);
  return result.insertId;
}

async function ownsConversation(id, clientId) {
  const [rows] = await pool.execute('SELECT id FROM conversations WHERE id = ? AND client_id = ?', [id, clientId]);
  return rows.length > 0;
}

async function addMessages(conversationId, messages) {
  for (const m of messages) {
    await pool.execute('INSERT INTO messages (conversation_id, role, content, sources) VALUES (?, ?, ?, ?)', [
      conversationId,
      m.role,
      m.content,
      m.sources && m.sources.length ? JSON.stringify(m.sources) : null,
    ]);
  }
  await pool.execute('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);
}

async function listConversations(clientId, limit = 30) {
  const [rows] = await pool.execute(
    `SELECT id, title, updated_at AS updatedAt FROM conversations
     WHERE client_id = ? ORDER BY updated_at DESC, id DESC LIMIT ${Number(limit) | 0}`,
    [clientId]
  );
  return rows;
}

async function getConversation(id, clientId) {
  const [conv] = await pool.execute('SELECT id, title FROM conversations WHERE id = ? AND client_id = ?', [id, clientId]);
  if (!conv.length) return null;
  const [rows] = await pool.execute(
    'SELECT role, content, sources FROM messages WHERE conversation_id = ? ORDER BY id ASC',
    [id]
  );
  const messages = rows.map((r) => {
    let sources = [];
    try {
      sources = r.sources ? JSON.parse(r.sources) : [];
    } catch (_) {
      /* fuentes corruptas: se ignoran */
    }
    return { role: r.role, content: r.content, sources };
  });
  return { ...conv[0], messages };
}

async function deleteConversation(id, clientId) {
  const [result] = await pool.execute('DELETE FROM conversations WHERE id = ? AND client_id = ?', [id, clientId]);
  return result.affectedRows > 0;
}

module.exports = {
  init,
  isAvailable,
  createConversation,
  ownsConversation,
  addMessages,
  listConversations,
  getConversation,
  deleteConversation,
};
