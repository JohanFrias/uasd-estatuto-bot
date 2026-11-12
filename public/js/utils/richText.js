/**
 * Convierte el texto de la IA en HTML seguro.
 * IMPORTANTE: primero se escapa TODO el HTML y solo después se agregan nuestras
 * propias etiquetas, de modo que el contenido nunca pueda inyectar código.
 */

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** **negrita** y citas "(Art. 34)" / "(Arts. 26 y 27)" resaltadas como etiquetas. */
function inline(escaped) {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\((Arts?\.\s*[\d\s,y]+(?:\s*(?:a|al|-)\s*\d+)?)\)/g, '<span class="cite">$1</span>')
    .replace(/\((Art[íi]culos?\s+[\d\s,y]+)\)/g, '<span class="cite">$1</span>');
}

/**
 * Soporta párrafos, listas con guion/viñeta/número y literales a), b)…
 * @param {string} text
 * @returns {string} HTML
 */
export function renderRichText(text) {
  const lines = escapeHtml(text).split('\n');
  const html = [];
  let list = null; // { tag: 'ul' | 'ol', items: [] }

  const closeList = () => {
    if (!list) return;
    html.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const bullet = line.match(/^(?:[-•*]\s+)(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const lettered = line.match(/^[a-zñ]\)\s+(.*)$/i);
    const item = bullet ? ['ul', bullet[1]] : numbered ? ['ol', numbered[1]] : lettered ? ['ul', lettered[1]] : null;

    if (item) {
      if (!list || list.tag !== item[0]) {
        closeList();
        list = { tag: item[0], items: [] };
      }
      list.items.push(item[1]);
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join('');
}
