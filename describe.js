const types = {};

const describe = node => {
  return types[node.type](node);
};

export default describe;

types.text = node => {
  return node.text;
};

types.echo = node => {
  return S(node.expression);
};

types.opt = node => {
  return `(Q ${node.question.join(' ')}) (A ${node.answer.join(' ')})`;
};

types.goto = _node => {
  return '';
};

types.call = node => {
  return `${node.label}(${node.args.map(S).join(' ')}) esc ${node.branch}`;
};

types.def = node => {
  return `(${node.locals.join(' ')})`;
};

types.jump = node => {
  return `${node.branch} if ${S(node.condition)}`;
};

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

types.set = node => {
  return `${node.variable} ${S(node.expression)}`;
};

types.move = node => {
  return `${S(node.source)} -> ${S(node.target)}`;
};

types.cue = node => {
  return node.cue;
};

types.br = _node => {
  return '';
};

types.par = _node => {
  return '';
};

types.rule = _node => {
  return '';
};

types.startJoin = _node => {
  return '';
};

types.stopJoin = _node => {
  return '';
};

types.delimit = _node => {
  return '';
};

types.ask = _node => {
  return '';
};

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
