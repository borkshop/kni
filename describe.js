const types = {};

const describe = node => {
  return types[node.type](node);
};

export default describe;

types.text = node => node.text;

types.echo = node => S(node.expression);

types.opt = node => `(Q ${node.question.join(' ')}) (A ${node.answer.join(' ')})`;

types.goto = _node => '';

types.call = node => `${node.label}(${node.args.map(S).join(' ')}) esc ${node.branch}`;

types.def = node => `(${node.locals.join(' ')})`;

types.jump = node => `${node.branch} if ${S(node.condition)}`;

types.switch = node => {
  let desc = '';
  if (node.variable) {
    desc += `(${node.variable}+${node.value}) ${S(node.expression)}`;
  } else {
    desc += S(node.expression);
  }
  desc += ` (${node.branches.join(' ')}) W(${node.weights.map(S).join(' ')})`;
  return desc;
};

types.set = node => `${node.variable} ${S(node.expression)}`;

types.move = node => `${S(node.source)} -> ${S(node.target)}`;

types.cue = node => node.cue;

types.br = _node => '';

types.par = _node => '';

types.rule = _node => '';

types.startJoin = _node => '';

types.stopJoin = _node => '';

types.delimit = _node => '';

types.ask = _node => '';

types.read = node => {
  let label = node.variable;
  if (node.cue != null) {
    label += ` ${node.cue}`;
  }
  return label;
};

const S = args => {
  if (args[0] === 'val' || args[0] === 'get') {
    return args[1];
  } else if (args[0] === 'var') {
    return `(${args[0]} ${V(args[1], args[2])})`;
  } else {
    return `(${args[0]} ${args.slice(1).map(S).join(' ')})`;
  }
};

const V = (source, target) => {
  let r = '';
  let i;
  for (i = 0; i < target.length; i++) {
    r += source[i];
    r += `{${S(target[i])}}`;
  }
  r += source[i];
  return r;
};
