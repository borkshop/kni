 const link = story => {
  const labels = Object.keys(story.states);
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const state = story.states[label];

    const link = linker(story, label, state);

    if (state.label != null) {
      state.label = link('label')(state.label);
    }
    if (state.next != null) {
      state.next = link('next')(state.next);
    }
    if (state.branch != null) {
      state.branch = link('branch')(state.branch);
    }
    if (state.question != null) {
      state.question = state.question.map(link('question'));
    }
    if (state.answer != null) {
      state.answer = state.answer.map(link('answer'));
    }
  }
};

export default link;

const linker = (story, context, state) => {
  const parts = context.split('.');
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
        candidate = candidate.join('.');
        if (story.states[candidate] != null) {
          return candidate;
        }
      }
      story.error(
        'Could not link ' +
          role +
          ' label ' +
          JSON.stringify(label) +
          ' at position ' +
          state.position
      );
      return label;
    };
  };
};
