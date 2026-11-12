-- Esquema de la base de datos del chatbot del Estatuto Orgánico de la UASD.
-- El servidor crea estas tablas automáticamente al iniciar; este archivo
-- sirve como documentación o para crearlas manualmente:
--   mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS uasd_chatbot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE uasd_chatbot;

-- Una conversación pertenece a un navegador anónimo (client_id guardado en localStorage).
CREATE TABLE IF NOT EXISTS conversations (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id   VARCHAR(64)  NOT NULL,
  title       VARCHAR(120) NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_client_updated (client_id, updated_at)
) ENGINE=InnoDB;

-- Mensajes de cada conversación (pregunta del usuario o respuesta del asistente).
CREATE TABLE IF NOT EXISTS messages (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id INT UNSIGNED    NOT NULL,
  role            ENUM('user', 'assistant') NOT NULL,
  content         TEXT            NOT NULL,
  sources         TEXT            NULL,      -- JSON con los artículos citados
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_conversation (conversation_id, id),
  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB;
