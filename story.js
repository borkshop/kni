import * as Path from './path.js';

/** @import { Path as PathType } from './path.js' */
/** @import { Expression } from './grammar-types' */

/**
 * Story is the container for all parsed story nodes.
 * It provides a registry of node constructors and tracks parsing errors.
 */
export default class Story {
  constructor() {
    /** @type {Record<string, any>} */
    this.states = {};
    /** @type {string[]} */
    this.errors = [];
    Object.seal(this);
  }

  /**
   * Creates a new story node at the given path.
   * @param {PathType} path
   * @param {string} type
   * @param {any} arg
   * @param {string | null} position
   * @returns {any}
   */
  create(path, type, arg, position) {
    const name = Path.toName(path);
    const Node = this.constructors[type];
    if (!Node) {
      throw new Error(`No node constructor for type: ${type}`);
    }
    const node = new Node(arg);
    node.position = position;
    this.states[name] = node;
    return node;
  }

  /**
   * Records a parsing error.
   * @param {string} error
   */
  error(error) {
    this.errors.push(error);
  }

  /** @type {Record<string, new (arg: any) => any>} */
  constructors = {
    /**
     * A text node displays literal text.
     */
    text: class Text {
      /**
       * @param {string} text
       */
      constructor(text) {
        this.type = 'text';
        this.text = text;
        this.lift = ' ';
        this.drop = ' ';
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * An echo node displays an expression's value.
     */
    echo: class Echo {
      /**
       * @param {Expression} expression
       */
      constructor(expression) {
        this.type = 'echo';
        this.expression = expression;
        this.lift = '';
        this.drop = '';
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * An option node represents a choice in the story.
     */
    option: class Option {
      /**
       * @param {any} _label
       */
      constructor(_label) {
        this.type = 'opt';
        /** @type {string[]} */
        this.question = [];
        /** @type {string[]} */
        this.answer = [];
        /** @type {string[] | null} */
        this.keywords = null;
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A goto node unconditionally jumps to another location.
     */
    goto: class Goto {
      /**
       * @param {string} next
       */
      constructor(next) {
        this.type = 'goto';
        this.next = next;
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A call node invokes a procedure.
     */
    call: class Call {
      /**
       * @param {string} label
       */
      constructor(label) {
        this.type = 'call';
        this.label = label;
        /** @type {Expression[] | null} */
        this.args = null;
        this.next = 'RET';
        this.branch = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A cue node marks a point that can be targeted by handlers.
     */
    cue: class Cue {
      /**
       * @param {string} cue
       */
      constructor(cue) {
        this.type = 'cue';
        this.cue = cue;
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A def node defines a procedure with local variables.
     */
    def: class Def {
      /**
       * @param {string[] | null} locals
       */
      constructor(locals) {
        this.type = 'def';
        this.locals = locals;
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A jump node conditionally branches.
     */
    jump: class Jump {
      /**
       * @param {Expression} condition
       */
      constructor(condition) {
        this.type = 'jump';
        this.condition = condition;
        this.branch = 'RET';
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A switch node selects among multiple branches.
     */
    switch: class Switch {
      /**
       * @param {Expression} expression
       */
      constructor(expression) {
        this.type = 'switch';
        this.expression = expression;
        /** @type {string | null} */
        this.variable = null;
        this.value = 0;
        /** @type {string | null} */
        this.mode = null;
        /** @type {string[]} */
        this.branches = [];
        /** @type {Expression[]} */
        this.weights = [];
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A move node assigns a value to a variable.
     */
    move: class Move {
      constructor() {
        this.type = 'move';
        /** @type {Expression | null} */
        this.source = null;
        /** @type {Expression | null} */
        this.target = null;
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A break node inserts a line break.
     */
    break: class Break {
      constructor() {
        this.type = 'br';
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A paragraph node inserts a paragraph break.
     */
    paragraph: class Paragraph {
      constructor() {
        this.type = 'par';
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A rule node inserts a horizontal rule.
     */
    rule: class Rule {
      constructor() {
        this.type = 'rule';
        this.next = 'RET';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * An ask node prompts for user input.
     */
    ask: class Ask {
      constructor() {
        this.type = 'ask';
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },

    /**
     * A read node reads user input into a variable.
     */
    read: class Read {
      /**
       * @param {string} variable
       */
      constructor(variable) {
        this.type = 'read';
        this.next = 'RET';
        this.variable = variable;
        /** @type {string | null} */
        this.cue = null;
        /** @type {string | null} */
        this.position = null;
        Object.seal(this);
      }
    },
  };
}
