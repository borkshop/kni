/** @import { default as Story } from './story' */

/**
 * Links all story nodes, resolving relative label references.
 * @param {Story} story
 */
const link = story => {
  const labels = Object.keys(story.states);
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const state = story.states[label];

    const linkFn = linker(story, label, state);

    if (state.label != null) {
      state.label = linkFn('label')(state.label);
    }
    if (state.next != null) {
      state.next = linkFn('next')(state.next);
    }
    if (state.branch != null) {
      state.branch = linkFn('branch')(state.branch);
    }
    if (state.question != null) {
      state.question = state.question.map(linkFn('question'));
    }
    if (state.answer != null) {
      state.answer = state.answer.map(linkFn('answer'));
    }
  }
};

export default link;

/**
 * Creates a linker for a specific context.
 * @param {Story} story
 * @param {string} context
 * @param {any} state
 * @returns {(role: string) => (label: string) => string}
 */
const linker = (story, context, state) => {
  const parts = context.split('.');
  /** @type {string[][]} */
  const ancestry = [];
  while (parts.length > 0) {
    ancestry.push(parts.slice());
    parts.pop();
  }
  ancestry.push([]);
  return role => {
    return label => {
      if (label === 'RET' || label === 'ESC') {
        return label;
      }
      for (let i = 0; i < ancestry.length; i++) {
        let candidate = ancestry[i].slice();
        candidate.push(label);
        const candidateStr = candidate.join('.');
        if (story.states[candidateStr] != null) {
          return candidateStr;
        }
      }
      story.error(
        `Could not link ${role} label ${JSON.stringify(label)} at position ${state.position}`
      );
      return label;
    };
  };
};
