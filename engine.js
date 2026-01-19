import evaluate from './evaluate.js';
import describe from './describe.js';

/** @import { Expression } from './grammar-types' */
/** @import { StoryState, States, Randomer, Render, Dialog, Handler, EngineArgs } from './engine-types' */

/**
 * @param {Scope} scope
 * @param {Randomer} randomer
 * @param {Expression[]} expressions
 * @param {number[]} weights
 * @returns {number}
 */
const weigh = (scope, randomer, expressions, weights) => {
  let weight = 0;
  for (let i = 0; i < expressions.length; i++) {
    weights[i] = /** @type {number} */ (evaluate(scope, randomer, expressions[i]));
    weight += weights[i];
  }
  return weight;
};

/**
 * @param {number[]} weights
 * @param {number} weight
 * @param {Randomer} randomer
 * @returns {number | null}
 */
const pick = (weights, weight, randomer) => {
  const offset = Math.floor(randomer.random() * weight);
  let passed = 0;
  for (let i = 0; i < weights.length; i++) {
    passed += weights[i];
    if (offset < passed) {
      return i;
    }
  }
  return null;
};

/**
 * @template T
 * @param {T[]} array
 * @param {number} index
 */
const pop = (array, index) => {
  array[index] = array[array.length - 1];
  array.length--;
};

/**
 * @typedef {Global | Frame} Scope
 */

export default class Engine {
  debug = typeof process === 'object' && process.env.DEBUG_ENGINE;

  /**
   * @param {EngineArgs} args
   */
  constructor(args) {
    this.story = args.story;
    this.labels = Object.keys(this.story);
    /** @type {Handler | undefined} */
    this.handler = args.handler;
    this.meter = 0;
    this.limit = 10e3; // bottles.kni, for example, runs long
    /** @type {Closure[]} */
    this.options = [];
    /** @type {Record<string, Closure>} */
    this.keywords = {};
    /** @type {Closure | null} */
    this.noOption = null;
    this.global = new Global(this.handler);
    /** @type {Global | Frame} */
    this.top = this.global;
    this.start = args.start || 'start';
    this.label = this.start;
    /** @type {StoryState} */
    this.instruction = {type: 'goto', next: this.start};
    this.render = args.render;
    this.dialog = args.dialog;
    this.dialog.engine = this;
    /** @type {Randomer} */
    this.randomer = args.randomer || Math;
    /** @type {any} */
    this.waypoint = this.capture();
    /** @type {string[]} */
    this.answerOnClearMeterFault = [];
    Object.seal(this);
  }

  reset() {
    this.labels = Object.keys(this.story);
    this.options = [];
    this.keywords = {};
    this.noOption = null;
    this.global = new Global(this.handler);
    this.top = this.global;
    this.label = this.start;
    this.instruction = {type: 'goto', next: this.start};
    this.waypoint = this.capture();
    this.resume();
  }

  /**
   * Runs the event loop until it yields.
   * @returns {void}
   */
  continue() {
    this.meter = 0;
    for (;;) {
      if (this.debug) {
        console.log(`${this.label} ${this.instruction.type} ${describe(this.instruction)}`);
        console.log(this.top);
      }
      if (this.instruction == null) {
        // TODO user error for non-console interaction.
        console.log(`The label ${JSON.stringify(this.label)} does not exist in this story`);
        this.end();
        return;
      }
      const methodName = /** @type {keyof this} */ (`$${this.instruction.type}`);
      if (!this[methodName]) {
        console.error(`Unexpected instruction type: ${this.instruction.type}`, this.instruction);
        this.resume();
      }
      const method = /** @type {() => boolean} */ (this[methodName]);
      const proceed = method.call(this);
      if (!proceed) {
        return;
      }
      this.meter += 1;
      if (this.meter >= this.limit) {
        this.display();
        this.dialog.meterFault();
        return;
      }
    }
  }

  clearMeterFault() {
    if (this.meter >= this.limit) {
      this.render.clear();
      this.continue();

      // flush answers posted while faulted
      const count = this.answerOnClearMeterFault.length;
      const answers = this.answerOnClearMeterFault.splice(0, count);
      for (const answer of answers) {
        this.answer(answer);
      }
    }
  }

  /**
   * @param {string} label
   * @returns {boolean}
   */
  goto(label) {
    while (this.top != null && (label == 'ESC' || label === 'RET')) {
      if (this.debug) {
        console.log(label.toLowerCase());
      }
      if (this.top.stopOption) {
        this.render.stopOption();
      }
      if (label === 'ESC') {
        label = this.top.branch;
      } else {
        label = this.top.next;
      }
      this.top = /** @type {Global | Frame} */ (this.top.parent);
    }

    if (label === 'RET') {
      return this.end();
    }

    const next = this.story[label];
    if (!next) {
      console.error('Story missing label', label);
      return this.resume();
    }
    if (!next) {
      console.error(`Story missing instruction for label: ${label}`);
      return this.resume();
    }
    if (this.handler && this.handler.goto) {
      this.handler.goto(label, next);
    }
    this.label = label;
    this.instruction = next;
    return true;
  }

  /**
   * @param {string[]} sequence
   * @param {string} next
   * @returns {boolean}
   */
  gothrough(sequence, next) {
    let prev = this.label;
    for (let i = sequence.length - 1; i >= 0; i--) {
      if (next !== 'RET') {
        this.top = new Frame(this.top, [], next, 'RET', prev);
      }
      prev = next;
      next = sequence[i];
    }
    return this.goto(next);
  }

  /**
   * @returns {boolean}
   */
  end() {
    if (this.handler && this.handler.end) {
      this.handler.end(this);
    }
    this.display();
    this.dialog.close();
    if (this.handler && this.handler.close) {
      this.handler.close(this);
    }
    return false;
  }

  /**
   * @returns {boolean | void}
   */
  ask() {
    if (this.options.length) {
      this.display();
      if (this.handler && this.handler.ask) {
        this.handler.ask(this);
      }
      this.dialog.ask();
    } else if (this.noOption != null) {
      const closure = this.noOption;
      const option = this.story[closure.label];
      this.top = closure.scope;
      const answer = option.answer;
      this.flush();
      if (answer) {
        this.gothrough(answer, 'RET');
      }
      this.continue();
    } else {
      return this.goto('RET');
    }
  }

  read() {
    this.display();
    if (this.handler && this.handler.ask) {
      this.handler.ask(this);
    }
    this.dialog.ask(this.instruction.cue);
  }

  /**
   * @param {string | number} text
   */
  answer(text) {
    if (this.meter >= this.limit) {
      this.answerOnClearMeterFault.push(String(text));
      return;
    }
    if (this.handler && this.handler.answer) {
      this.handler.answer(String(text), this);
    }
    this.render.flush();
    if (this.instruction.type === 'read') {
      if (this.instruction.variable) {
        this.top.set(this.instruction.variable, text);
      }
      this.render.clear();
      if (this.instruction.next && this.goto(this.instruction.next)) {
        this.continue();
      }
      return;
    }
    const choice = Number(text) - 1;
    if (choice >= 0 && choice < this.options.length) {
      return this.choice(this.options[choice]);
    } else if (this.keywords[String(text)]) {
      return this.choice(this.keywords[String(text)]);
    } else {
      this.render.pardon();
      this.ask();
    }
  }

  /**
   * @param {Closure} closure
   */
  choice(closure) {
    const option = this.story[closure.label];
    if (this.handler && this.handler.choice) {
      this.handler.choice(option, this);
    }
    this.render.clear();
    this.waypoint = this.capture(closure);
    if (this.handler && this.handler.waypoint) {
      this.handler.waypoint(this.waypoint, this);
    }
    // Resume in the option's closure scope.
    this.top = closure.scope;
    // There is no known case where gothrough would immediately exit for
    // lack of further instructions, so
    if (option.answer && this.gothrough(option.answer, 'RET')) {
      this.flush();
      this.continue();
    }
  }

  display() {
    this.render.display();
  }

  flush() {
    this.options.length = 0;
    this.noOption = null;
    this.keywords = {};
  }

  /**
   * @param {string} text
   * @returns {boolean}
   */
  write(text) {
    this.render.write(this.instruction.lift || '', text, this.instruction.drop || '');
    return this.goto(this.instruction.next || 'RET');
  }

  /**
   * @param {Closure} [closure]
   * @returns {any}
   */
  capture(closure) {
    let label, top;
    if (closure != null) {
      label = closure.label;
      top = closure.scope;
    } else {
      label = this.label;
      top = this.top;
    }

    /** @type {any[]} */
    const stack = [];
    for (; top != this.global; top = /** @type {Frame} */ (top).parent) {
      stack.push(/** @type {Frame} */ (top).capture(this));
    }

    return [
      this.indexOfLabel(label),
      stack,
      this.global.capture(),
      [
        this.randomer._state0U || 0,
        this.randomer._state0L || 0,
        this.randomer._state1U || 0,
        this.randomer._state1L || 0,
      ],
    ];
  }

  /**
   * Resumes from a snapshot.
   * @param {any} [snapshot]
   * @returns {boolean}
   */
  resume(snapshot) {
    this.render.clear();
    this.flush();
    this.label = this.start;
    this.instruction = this.story[this.label];
    this.global = new Global(this.handler);
    this.top = this.global;
    if (snapshot == null) {
      if (this.handler && this.handler.waypoint) {
        this.handler.waypoint(null, this);
      }
      this.continue();
      return true;
    }

    // Destructure snapshot
    const label = this.labelOfIndex(snapshot[0]);
    const stack = snapshot[1];
    const global = snapshot[2];
    const random = snapshot[3];

    // Restore globals
    const keys = global[0];
    const values = global[1];
    for (let i = 0; i < keys.length; i++) {
      this.global.set(keys[i], values[i]);
    }

    // Restore stack
    const engine = this;
    this.top = stack.reduceRight(
      /**
       * @param {Global | Frame} parent
       * @param {any} snapshotFrame
       * @returns {Frame}
       */
      function (parent, snapshotFrame) {
        return Frame.restore(engine, snapshotFrame, parent);
      },
      this.global
    );

    // Restore prng
    this.randomer._state0U = random[0];
    this.randomer._state0L = random[1];
    this.randomer._state1U = random[2];
    this.randomer._state1L = random[3];

    const instruction = this.story[label];
    if (instruction.type === 'opt') {
      if (instruction.answer && this.gothrough(instruction.answer, 'RET')) {
        this.flush();
        this.continue();
      }
    } else {
      this.label = label;
      this.flush();
      this.continue();
    }
    return true;
  }

  log() {
    this.top.log();
    console.log('');
  }

  /**
   * @param {number} index
   * @returns {string}
   */
  labelOfIndex(index) {
    if (index == -2) {
      return 'RET';
    } else if (index === -3) {
      return 'ESC';
    }
    return this.labels[index];
  }

  /**
   * @param {string} label
   * @returns {number}
   */
  indexOfLabel(label) {
    if (label === 'RET') {
      return -2;
    } else if (label === 'ESC') {
      return -3;
    }
    return this.labels.indexOf(label);
  }

  // Here begin the instructions

  /**
   * @returns {boolean}
   */
  $text() {
    return this.write(this.instruction.text || '');
  }

  /**
   * @returns {boolean}
   */
  $echo() {
    return this.write(
      `${evaluate(this.top, this.randomer, this.instruction.expression || ['val', 0])}`
    );
  }

  /**
   * @returns {boolean}
   */
  $br() {
    this.render.break();
    return this.goto(this.instruction.next || 'RET');
  }

  /**
   * @returns {boolean}
   */
  $par() {
    this.render.paragraph();
    return this.goto(this.instruction.next || 'RET');
  }

  /**
   * @returns {boolean}
   */
  $rule() {
    // TODO
    this.render.paragraph();
    return this.goto(this.instruction.next || 'RET');
  }

  /**
   * @returns {boolean}
   */
  $goto() {
    return this.goto(this.instruction.next || 'RET');
  }

  /**
   * @returns {boolean}
   */
  $call() {
    const label = this.instruction.label;
    if (!label) {
      console.error(`no label for call`, this.instruction);
      return this.resume();
    }
    const def = this.story[label];
    if (!def) {
      console.error(`no such procedure ${label}`, this.instruction);
      return this.resume();
    }
    if (def.type !== 'def') {
      console.error(`Can't call non-procedure ${label}`, this.instruction);
      return this.resume();
    }
    const defLocals = def.locals || [];
    const instrArgs = this.instruction.args || [];
    if (defLocals.length !== instrArgs.length) {
      console.error(`Argument length mismatch for ${label}`, this.instruction);
      return this.resume();
    }
    // TODO replace this.global with closure scope if scoped procedures become
    // viable. This will require that the engine create references to closures
    // when entering a new scope (calling a procedure), in addition to
    // capturing locals. As such the parser will need to retain a reference to
    // the enclosing procedure and note all of the child procedures as they are
    // encountered.
    this.top = new Frame(
      this.top,
      defLocals,
      this.instruction.next || 'RET',
      this.instruction.branch || 'RET',
      this.label
    );
    const parent = /** @type {Frame} */ (this.top).parent;
    for (let i = 0; i < instrArgs.length; i++) {
      const arg = instrArgs[i];
      const value = evaluate(parent, this.randomer, arg);
      this.top.set(defLocals[i], value);
    }
    return this.goto(label);
  }

  /**
   * @returns {boolean}
   */
  $def() {
    // Procedure argument instructions exist as targets for labels as well as
    // for reference to locals in calls.
    return this.goto(this.instruction.next || 'RET');
  }

  /**
   * @returns {boolean}
   */
  $opt() {
    const closure = new Closure(this.top, this.label);
    const keywords = this.instruction.keywords || [];
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      // The first option to introduce a keyword wins, not the last.
      if (!this.keywords[keyword]) {
        this.keywords[keyword] = closure;
      }
    }
    const question = this.instruction.question || [];
    if (question.length > 0) {
      this.options.push(closure);
      this.render.startOption();
      this.top = new Frame(this.top, [], this.instruction.next || 'RET', 'RET', this.label, true);
      return this.gothrough(question, 'RET');
    } else if (this.noOption == null) {
      this.noOption = closure;
    }
    return this.goto(this.instruction.next || 'RET');
  }

  /**
   * @returns {boolean}
   */
  $move() {
    const value = evaluate(this.top, this.randomer, this.instruction.source || ['val', 0]);
    const name = evaluate.nominate(
      this.top,
      this.randomer,
      /** @type {Expression} */ (this.instruction.target || ['val', ''])
    );
    if (this.debug) {
      console.log(`${this.top.at()}/${this.label} ${name} = ${value}`);
    }
    this.top.set(name, value);
    return this.goto(this.instruction.next || 'RET');
  }

  /**
   * @returns {boolean}
   */
  $jump() {
    const j = this.instruction;
    if (evaluate(this.top, this.randomer, j.condition || ['val', 0])) {
      return this.goto(this.instruction.branch || 'RET');
    } else {
      return this.goto(this.instruction.next || 'RET');
    }
  }

  /**
   * @returns {boolean}
   */
  $switch() {
    const branches = (this.instruction.branches || []).slice();
    const weightExpressions = (this.instruction.weights || []).slice();
    let samples = 1;
    /** @type {string[]} */
    const nexts = [];
    if (this.instruction.mode === 'pick') {
      samples = /** @type {number} */ (
        evaluate(this.top, this.randomer, this.instruction.expression || ['val', 1])
      );
    }
    /** @type {number} */
    let value = 0;
    /** @type {string} */
    let next = '';
    for (let i = 0; i < samples; i++) {
      /** @type {number[]} */
      const weights = [];
      const weight = weigh(this.top, this.randomer, weightExpressions, weights);
      if (this.instruction.mode === 'rand' || this.instruction.mode === 'pick') {
        if (weights.length === weight) {
          value = Math.floor(this.randomer.random() * branches.length);
        } else {
          const picked = pick(weights, weight, this.randomer);
          if (picked == null) {
            break;
          }
          value = picked;
        }
      } else {
        value = /** @type {number} */ (
          evaluate(this.top, this.randomer, this.instruction.expression || ['val', 0])
        );
        if (this.instruction.variable != null) {
          this.top.set(this.instruction.variable, value + (this.instruction.value || 0));
        }
      }
      if (this.instruction.mode === 'loop') {
        // actual modulo, wraps negatives
        value = ((value % branches.length) + branches.length) % branches.length;
      } else if (this.instruction.mode === 'hash') {
        value = evaluate.hash(value) % branches.length;
      }
      value = Math.min(value, branches.length - 1);
      value = Math.max(value, 0);
      next = branches[value];
      pop(branches, value);
      pop(weightExpressions, value);
      nexts.push(next);
    }
    if (this.debug) {
      console.log(`${this.top.at()}/${this.label} ${value} -> ${next}`);
    }
    return this.gothrough(nexts, this.instruction.next || 'RET');
  }

  /**
   * @returns {boolean}
   */
  $cue() {
    if (this.handler != null && this.handler.cue != null) {
      return this.handler.cue(this.instruction.cue || '', this.instruction.next || 'RET', this);
    } else {
      return this.goto(this.instruction.next || 'RET');
    }
  }

  /**
   * @returns {boolean}
   */
  $ask() {
    this.ask();
    return false;
  }

  /**
   * @returns {boolean}
   */
  $read() {
    this.read();
    return false;
  }
}

class Global {
  /** @type {undefined} */
  parent = undefined;
  stopOption = false;

  /**
   * @param {Handler | undefined} handler
   */
  constructor(handler) {
    /** @type {Record<string, any>} */
    this.scope = Object.create(null);
    this.handler = handler;
    this.next = 'RET';
    this.branch = 'RET';
    Object.seal(this);
  }

  /**
   * @param {string} name
   * @returns {any}
   */
  get(name) {
    if (this.handler && this.handler.has && this.handler.has(name)) {
      return this.handler.get ? this.handler.get(name) : 0;
    } else {
      return this.scope[name] || 0;
    }
  }

  /**
   * @param {string} name
   * @param {any} value
   */
  set(name, value) {
    if (this.handler && this.handler.has && this.handler.has(name)) {
      if (this.handler.set) {
        this.handler.set(name, value);
      }
    } else {
      this.scope[name] = value;
    }
    if (this.handler && this.handler.changed) {
      this.handler.changed(name, value);
    }
  }

  log() {
    const names = Object.keys(this.scope);
    names.sort();
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const value = this.scope[name];
      console.log(`${name} = ${value}`);
    }
    console.log('');
  }

  /**
   * @returns {string}
   */
  at() {
    return '';
  }

  /**
   * @returns {[string[], any[]]}
   */
  capture() {
    const names = Object.keys(this.scope);
    /** @type {any[]} */
    const values = [];
    for (let i = 0; i < names.length; i++) {
      values[i] = this.scope[names[i]] || 0;
    }
    return [names, values];
  }
}

class Frame {
  /**
   * @param {Engine} engine
   * @param {any} snapshot
   * @param {Global | Frame} parent
   * @returns {Frame}
   */
  static restore(engine, snapshot, parent) {
    const label = engine.labelOfIndex(snapshot[0]);
    const next = engine.labelOfIndex(snapshot[1]);
    const branch = engine.labelOfIndex(snapshot[2]);
    const values = snapshot[3];
    const stopOption = Boolean(snapshot[4]);

    const frame = new Frame(parent, [], next, branch, label, stopOption);

    // Technically, not all frames correspond to subroutine calls, but all
    // frames that remain when the engine pauses ought to be.
    // The exceptions would be interstitial frames generated by gothrough,
    // but all of these are exhausted before the engine stops to ask a prompt.
    const call = engine.story[label];
    if (call && call.label) {
      const def = engine.story[call.label];
      if (def && def.locals) {
        frame.locals = def.locals;
        for (let i = 0; i < values.length; i++) {
          const name = def.locals[i];
          frame.scope[name] = values[i];
        }
      }
    }

    return frame;
  }

  /**
   * @param {Global | Frame} parent
   * @param {string[]} locals
   * @param {string} next
   * @param {string} branch
   * @param {string} label
   * @param {boolean} [stopOption]
   */
  constructor(parent, locals, next, branch, label, stopOption) {
    this.locals = locals;
    /** @type {Record<string, any>} */
    this.scope = Object.create(null);
    for (let i = 0; i < locals.length; i++) {
      this.scope[locals[i]] = 0;
    }
    this.parent = parent;
    this.next = next;
    this.branch = branch;
    this.label = label;
    this.stopOption = stopOption || false;
    Object.seal(this);
  }

  /**
   * @param {string} name
   * @returns {any}
   */
  get(name) {
    if (this.locals.indexOf(name) >= 0) {
      return this.scope[name];
    }
    return this.parent.get(name);
  }

  /**
   * @param {string} name
   * @param {any} value
   */
  set(name, value) {
    if (this.locals.indexOf(name) >= 0) {
      this.scope[name] = value;
      return;
    }
    this.parent.set(name, value);
  }

  log() {
    this.parent.log();
    console.log(`--- ${this.label} -> ${this.next}`);
    for (let i = 0; i < this.locals.length; i++) {
      const name = this.locals[i];
      const value = this.scope[name];
      console.log(`${name} = ${value}`);
    }
  }

  /**
   * @returns {string}
   */
  at() {
    return `${this.parent.at()}/${this.label}`;
  }

  /**
   * @param {Engine} engine
   * @returns {any[]}
   */
  capture(engine) {
    /** @type {any[]} */
    const values = [];
    for (let i = 0; i < this.locals.length; i++) {
      const local = this.locals[i];
      values.push(this.scope[local] || 0);
    }

    return [
      engine.indexOfLabel(this.label),
      engine.indexOfLabel(this.next),
      engine.indexOfLabel(this.branch),
      values,
      +this.stopOption,
    ];
  }
}

class Closure {
  /**
   * @param {Global | Frame} scope
   * @param {string} label
   */
  constructor(scope, label) {
    this.scope = scope;
    this.label = label;
    Object.seal(this);
  }
}
