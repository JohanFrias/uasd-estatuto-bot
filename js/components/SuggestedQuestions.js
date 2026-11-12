import { el } from '../utils/dom.js';
import { SUGGESTION_GROUPS, QUICK_QUESTIONS } from '../data/suggestions.js';

/**
 * Pantalla de bienvenida: pestañas por tema + tarjetas con las preguntas.
 * @param {{onSelect: (question: string, preferExtractive: boolean) => void}} props
 * @returns {{element: HTMLElement, setDisabled: (disabled: boolean) => void}}
 */
export function SuggestedQuestions({ onSelect }) {
  const grid = el('div', { class: 'suggest-grid', role: 'tabpanel' });
  const tabs = el('div', { class: 'suggest-tabs', role: 'tablist', 'aria-label': 'Temas del Estatuto' });
  const root = el('div', {}, tabs, grid);
  let disabled = false;

  function show(groupId) {
    const group = SUGGESTION_GROUPS.find((g) => g.id === groupId) || SUGGESTION_GROUPS[0];
    for (const tab of tabs.children) tab.setAttribute('aria-selected', String(tab.dataset.group === group.id));
    grid.replaceChildren(
      ...group.questions.map((question) =>
        el('button', { class: 'suggest-card', type: 'button', disabled, onclick: () => onSelect(question, true) }, question)
      )
    );
  }

  for (const group of SUGGESTION_GROUPS) {
    tabs.append(
      el('button', { class: 'tab', type: 'button', role: 'tab', 'data-group': group.id, onclick: () => show(group.id) }, group.label)
    );
  }
  show(SUGGESTION_GROUPS[0].id);

  return {
    element: root,
    setDisabled(value) {
      disabled = value;
      for (const card of grid.children) card.disabled = value;
    },
  };
}

/**
 * Barra horizontal con preguntas rápidas (visible mientras se conversa).
 * @param {{onSelect: (question: string, preferExtractive: boolean) => void}} props
 */
export function QuickQuestions({ onSelect }) {
  const bar = el(
    'div',
    { class: 'suggestion-bar-inner', style: 'display:contents' },
    QUICK_QUESTIONS.map((question) => el('button', { class: 'chip', type: 'button', onclick: () => onSelect(question, true) }, question))
  );
  return {
    element: bar,
    setDisabled(value) {
      for (const chip of bar.children) chip.disabled = value;
    },
  };
}
