import { el } from '../utils/dom.js';
import { renderRichText } from '../utils/richText.js';

/** Etiquetas con los artículos del Estatuto en los que se basa la respuesta. */
function Sources(sources) {
  if (!sources || !sources.length) return null;
  return el(
    'div',
    { class: 'sources' },
    el('strong', {}, 'Fuente en el Estatuto: '),
    sources.map((s) =>
      el('span', { class: 'source-tag', title: [s.chapter, s.chapterTitle].filter(Boolean).join(' · ') }, s.label)
    )
  );
}

/**
 * Burbuja de mensaje.
 * @param {{role: 'user'|'assistant', content: string, sources?: Array, isError?: boolean, onRetry?: Function}} props
 */
export function Message({ role, content, sources, isError = false, onRetry }) {
  const bubble = el('div', { class: 'bubble' });

  if (role === 'assistant' && !isError) bubble.innerHTML = renderRichText(content); // texto escapado
  else bubble.textContent = content; // el texto del usuario y de los errores nunca se interpreta como HTML

  const src = role === 'assistant' && !isError ? Sources(sources) : null;
  if (src) bubble.append(src);
  if (isError && onRetry) bubble.append(el('button', { class: 'btn retry-btn', type: 'button', onclick: onRetry }, 'Reintentar'));

  return el(
    'div',
    { class: `msg ${role}${isError ? ' error' : ''}` },
    role === 'assistant' ? el('div', { class: 'avatar', 'aria-hidden': 'true' }, 'UASD') : null,
    bubble
  );
}

/** Indicador de "escribiendo…" mientras llega la respuesta. */
export function TypingIndicator() {
  return el(
    'div',
    { class: 'msg assistant', role: 'status', 'aria-label': 'El asistente está escribiendo' },
    el('div', { class: 'avatar', 'aria-hidden': 'true' }, 'UASD'),
    el('div', { class: 'bubble' }, el('div', { class: 'typing' }, el('span'), el('span'), el('span')))
  );
}
