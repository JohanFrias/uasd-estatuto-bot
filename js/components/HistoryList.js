import { el, formatDate } from '../utils/dom.js';

/**
 * Lista de conversaciones anteriores en la barra lateral.
 * @param {{conversations: Array, activeId: number|null, onOpen: Function, onDelete: Function}} props
 */
export function HistoryList({ conversations, activeId, onOpen, onDelete }) {
  return conversations.map((c) =>
    el(
      'li',
      { class: `history-item${c.id === activeId ? ' active' : ''}` },
      el(
        'button',
        { class: 'history-open', type: 'button', onclick: () => onOpen(c.id), 'aria-current': c.id === activeId ? 'true' : null },
        el('span', { class: 't' }, c.title),
        el('span', { class: 'd' }, formatDate(c.updatedAt))
      ),
      el(
        'button',
        {
          class: 'history-delete',
          type: 'button',
          title: 'Eliminar conversación',
          'aria-label': `Eliminar la conversación "${c.title}"`,
          onclick: () => onDelete(c),
        },
        '×'
      )
    )
  );
}
