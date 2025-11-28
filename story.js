'use strict';

const Path = require('./path');

module.exports = class Story {
  constructor() {
    this.states = {};
    this.errors = [];
    Object.seal(this);
  }

  create(path, type, arg, position) {
    const name = Path.toName(path);
    const Node = this.constructors[type];
    if (!Node) {
      throw new Error('No node constructor for type: ' + type);
    }
    const node = new Node(arg);
    node.position = position;
    this.states[name] = node;
    return node;
  }

  error(error) {
    this.errors.push(error);
  }

  constructors = {
    text: class Text {
      constructor(text) {
        this.type = 'text';
        this.text = text;
        this.lift = ' ';
        this.drop = ' ';
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    echo: class Echo {
      constructor(expression) {
        this.type = 'echo';
        this.expression = expression;
        this.lift = '';
        this.drop = '';
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    option: class Option {
      constructor(_label) {
        this.type = 'opt';
        this.question = [];
        this.answer = [];
        this.keywords = null;
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    goto: class Goto {
      constructor(next) {
        this.type = 'goto';
        this.next = next;
        this.position = null;
        Object.seal(this);
      }
    },

    call: class Call {
      constructor(label) {
        this.type = 'call';
        this.label = label;
        this.args = null;
        this.next = 'RET';
        this.branch = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    cue: class Cue {
      constructor(cue) {
        this.type = 'cue';
        this.cue = cue;
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    def: class Def {
      constructor(locals) {
        this.type = 'def';
        this.locals = locals;
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    jump: class Jump {
      constructor(condition) {
        this.type = 'jump';
        this.condition = condition;
        this.branch = 'RET';
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    switch: class Switch {
      constructor(expression) {
        this.type = 'switch';
        this.expression = expression;
        this.variable = null;
        this.value = 0;
        this.mode = null;
        this.branches = [];
        this.weights = [];
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    move: class Move {
      constructor() {
        this.type = 'move';
        this.source = null;
        this.target = null;
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    break: class Break {
      constructor() {
        this.type = 'br';
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    paragraph: class Paragraph {
      constructor() {
        this.type = 'par';
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    rule: class Rule {
      constructor() {
        this.type = 'rule';
        this.next = 'RET';
        this.position = null;
        Object.seal(this);
      }
    },

    ask: class Ask {
      constructor() {
        this.type = 'ask';
        this.position = null;
        Object.seal(this);
      }
    },

    read: class Read {
      constructor(variable) {
        this.type = 'read';
        this.next = 'RET';
        this.variable = variable;
        this.cue = null;
        this.position = null;
        Object.seal(this);
      }
    },
  };
};
