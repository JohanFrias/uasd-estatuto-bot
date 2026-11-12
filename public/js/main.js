/**
 * Controlador principal de la interfaz.
 * Conecta los componentes con la API y mantiene el estado de la conversación.
 */

import { api, ApiError } from './api.js';
import { Message, TypingIndicator } from './components/Message.js';
import { SuggestedQuestions, QuickQuestions } from './components/SuggestedQuestions.js';
import { HistoryList } from './components/HistoryList.js';

// ---------- Elementos de la página ----------
const $ = (id) => document.getElementById(id);
const app = $('app');
const chat = $('chat');
const welcome = $('welcome');
const messagesEl = $('messages');
const form = $('chatForm');
const input = $('messageInput');
const sendBtn = $('sendBtn');
const suggestionBar = $('suggestionBar');
const historyList = $('historyList');
const historyEmpty = $('historyEmpty');
const statusBadge = $('statusBadge');

// ---------- Estado ----------
const MAX_HISTORY_FOR_AI = 6; // mensajes previos que se envían como contexto
const state = {
  clientId: getClientId(),
  conversationId: null,
  transcript: [], // [{role, content}] de la conversación actual
  busy: false,
  historyAvailable: false,
};

/** Identificador anónimo por navegador (para separar el historial de cada persona). */
function getClientId() {
  try {
    let id = localStorage.getItem('uasd-client-id');
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `c-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
      localStorage.setItem('uasd-client-id', id);
    }
    return id;
  } catch (_) {
    return `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`; // localStorage bloqueado
  }
}

// ---------- Componentes de sugerencias ----------
const welcomeSuggestions = SuggestedQuestions({ onSelect: sendQuestion });
$('welcomeSuggestions').append(welcomeSuggestions.element);
const quickQuestions = QuickQuestions({ onSelect: sendQuestion });
suggestionBar.append(quickQuestions.element);

// ---------- Utilidades de interfaz ----------
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function setBusy(value) {
  state.busy = value;
  sendBtn.disabled = value;
  input.disabled = value;
  welcomeSuggestions.setDisabled(value);
  quickQuestions.setDisabled(value);
  if (!value) input.focus();
}

function showConversationView(hasMessages) {
  welcome.hidden = hasMessages;
  suggestionBar.hidden = !hasMessages;
}

function appendMessage(props) {
  const node = Message(props);
  messagesEl.append(node);
  scrollToBottom();
  return node;
}

function autoResize() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
}

function toggleMenu(open) {
  app.classList.toggle('menu-open', open);
  $('backdrop').hidden = !open;
  $('menuBtn').setAttribute('aria-expanded', String(open));
}

// ---------- Enviar una pregunta ----------
async function sendQuestion(rawText, preferExtractive = false) {
  const text = rawText.trim();
  if (!text || state.busy) return;

  toggleMenu(false);
  showConversationView(true);
  appendMessage({ role: 'user', content: text });
  input.value = '';
  autoResize();

  const history = state.transcript.slice(-MAX_HISTORY_FOR_AI);
  await requestAnswer(text, history, preferExtractive);
}

/** Pide la respuesta al servidor; en caso de error ofrece reintentar sin duplicar la pregunta. */
async function requestAnswer(text, history, preferExtractive = false) {
  setBusy(true);
  const typing = TypingIndicator();
  messagesEl.append(typing);
  scrollToBottom();

  try {
    const data = await api.chat({
      message: text,
      clientId: state.clientId,
      conversationId: state.conversationId,
      history,
      preferExtractive,
    });
    typing.remove();

    state.transcript.push({ role: 'user', content: text }, { role: 'assistant', content: data.answer });
    if (data.conversationId) {
      const isNew = state.conversationId !== data.conversationId;
      state.conversationId = data.conversationId;
      appendMessage({ role: 'assistant', content: data.answer, sources: data.sources });
      if (isNew || state.historyAvailable) await refreshHistory();
    } else {
      appendMessage({ role: 'assistant', content: data.answer, sources: data.sources });
    }
  } catch (err) {
    typing.remove();
    const message = err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.';
    const node = appendMessage({
      role: 'assistant',
      isError: true,
      content: message,
      onRetry: () => {
        node.remove();
        requestAnswer(text, history, preferExtractive);
      },
    });
  } finally {
    setBusy(false);
  }
}

// ---------- Historial ----------
async function refreshHistory() {
  try {
    const { available, conversations } = await api.listConversations(state.clientId);
    state.historyAvailable = available;
    historyList.replaceChildren(
      ...HistoryList({ conversations, activeId: state.conversationId, onOpen: openConversation, onDelete: removeConversation })
    );
    historyEmpty.hidden = conversations.length > 0;
    historyEmpty.textContent = available
      ? 'Aún no tienes conversaciones guardadas.'
      : 'El historial guardado no está disponible; tu conversación actual se mantiene mientras la página esté abierta.';
  } catch (_) {
    historyEmpty.hidden = false;
    historyEmpty.textContent = 'No se pudo cargar el historial.';
  }
}

async function openConversation(id) {
  if (state.busy) return;
  try {
    const conversation = await api.getConversation(id, state.clientId);
    state.conversationId = conversation.id;
    state.transcript = conversation.messages.map(({ role, content }) => ({ role, content }));
    messagesEl.replaceChildren();
    for (const m of conversation.messages) appendMessage(m);
    showConversationView(true);
    toggleMenu(false);
    await refreshHistory();
  } catch (err) {
    appendMessage({ role: 'assistant', isError: true, content: err.message });
  }
}

async function removeConversation(conversation) {
  if (!window.confirm(`¿Eliminar la conversación "${conversation.title}"?`)) return;
  try {
    await api.deleteConversation(conversation.id, state.clientId);
    if (conversation.id === state.conversationId) startNewChat();
    await refreshHistory();
  } catch (err) {
    window.alert(err.message);
  }
}

function startNewChat() {
  state.conversationId = null;
  state.transcript = [];
  messagesEl.replaceChildren();
  showConversationView(false);
  toggleMenu(false);
  chat.scrollTop = 0;
  refreshHistory();
  input.focus();
}

// ---------- Eventos ----------
form.addEventListener('submit', (event) => {
  event.preventDefault();
  sendQuestion(input.value);
});

input.addEventListener('keydown', (event) => {
  // Enter envía; Shift+Enter agrega un salto de línea.
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendQuestion(input.value);
  }
});
input.addEventListener('input', autoResize);

$('newChatBtn').addEventListener('click', startNewChat);
$('menuBtn').addEventListener('click', () => toggleMenu(!app.classList.contains('menu-open')));
$('backdrop').addEventListener('click', () => toggleMenu(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') toggleMenu(false);
});

// ---------- Inicio ----------
async function init() {
  showConversationView(false);
  await refreshHistory();
  try {
    const health = await api.health();
    const notes = [];
    if (!health.ai) notes.push('modo básico (sin IA)');
    if (!health.fragments) notes.push('Estatuto no cargado');
    if (notes.length) {
      statusBadge.textContent = notes.join(' · ');
      statusBadge.hidden = false;
    }
  } catch (_) {
    statusBadge.textContent = 'sin conexión con el servidor';
    statusBadge.hidden = false;
  }
  input.focus();
}

init();
