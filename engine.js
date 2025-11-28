'use strict';

const evaluate = require('./evaluate');
const describe = require('./describe');

const weigh = (scope, randomer, expressions, weights) => {
  let weight = 0;
  for (let i = 0; i < expressions.length; i++) {
    weights[i] = evaluate(scope, randomer, expressions[i]);
    weight += weights[i];
  }
  return weight;
};

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

const pop = (array, index) => {
  array[index] = array[array.length - 1];
  array.length--;
};

module.exports = class Engine {
  debug = typeof process === 'object' && process.env.DEBUG_ENGINE;

  constructor(args) {
    this.story = args.story;
    this.labels = Object.keys(this.story);
    this.handler = args.handler;
    this.options = [];
    this.keywords = {};
    this.noOption = null;
    this.global = new Global(this.handler);
    this.top = this.global;
    this.start = args.start || 'start';
    this.label = this.start;
    this.instruction = {type: 'goto', next: this.start};
    this.render = args.render;
    this.dialog = args.dialog;
    this.dialog.engine = this;
    this.randomer = args.randomer || Math;
    this.waypoint = this.capture();
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

  continue() {
    let _continue;
    do {
      if (this.debug) {
        console.log(this.label + ' ' + this.instruction.type + ' ' + describe(this.instruction));
      }
      if (this.instruction == null) {
        // TODO user error for non-console interaction.
        console.log('The label ' + JSON.stringify(this.label) + ' does not exist in this story');
        this.end();
        return;
      }
      if (!this['$' + this.instruction.type]) {
        console.error('Unexpected instruction type: ' + this.instruction.type, this.instruction);
        this.resume();
      }
      _continue = this['$' + this.instruction.type](this.instruction);
    } while (_continue);
  }

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
      this.top = this.top.parent;
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
      console.error('Story missing instruction for label: ' + label);
      return this.resume();
    }
    if (this.handler && this.handler.goto) {
      this.handler.goto(label, next);
    }
    this.label = label;
    this.instruction = next;
    return true;
  }

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

  end() {
    if (this.handler && this.handler.end) {
      this.handler.end(this);
    }
    this.display();
    this.dialog.close();
    return false;
  }

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
      this.gothrough(answer, 'RET');
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

  answer(text) {
    if (this.handler && this.handler.answer) {
      this.handler.answer(text, this);
    }
    this.render.flush();
    if (this.instruction.type === 'read') {
      this.top.set(this.instruction.variable, text);
      this.render.clear();
      if (this.goto(this.instruction.next)) {
        this.continue();
      }
      return;
    }
    const choice = text - 1;
    if (choice >= 0 && choice < this.options.length) {
      return this.choice(this.options[choice]);
    } else if (this.keywords[text]) {
      return this.choice(this.keywords[text]);
    } else {
      this.render.pardon();
      this.ask();
    }
  }

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
    if (this.gothrough(option.answer, 'RET')) {
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

  write(text) {
    this.render.write(this.instruction.lift, text, this.instruction.drop);
    return this.goto(this.instruction.next);
  }

  capture(closure) {
    let label, top;
    if (closure != null) {
      label = closure.label;
      top = closure.scope;
    } else {
      label = this.label;
      top = this.top;
    }

    const stack = [];
    for (; top != this.global; top = top.parent) {
      stack.push(top.capture(this));
    }

    return [
      this.indexOfLabel(label),
      stack,
      this.global.capture(),
      [
        this.randomer._state0U | 0,
        this.randomer._state0L | 0,
        this.randomer._state1U | 0,
        this.randomer._state1L | 0,
      ],
    ];
  }

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
      return;
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
    this.top = stack.reduceRight(function (parent, snapshot) {
      return Frame.restore(engine, snapshot, parent);
    }, this.global);

    // Restore prng
    this.randomer._state0U = random[0];
    this.randomer._state0L = random[1];
    this.randomer._state1U = random[2];
    this.randomer._state1L = random[3];

    const instruction = this.story[label];
    if (instruction.type === 'opt') {
      if (this.gothrough(instruction.answer, 'RET')) {
        this.flush();
        this.continue();
      }
    } else {
      this.label = label;
      this.flush();
      this.continue();
    }
  }

  log() {
    this.top.log();
    console.log('');
  }

  labelOfIndex(index) {
    if (index == -2) {
      return 'RET';
    } else if (index === -3) {
      return 'ESC';
    }
    return this.labels[index];
  }

  indexOfLabel(label) {
    if (label === 'RET') {
      return -2;
    } else if (label === 'ESC') {
      return -3;
    }
    return this.labels.indexOf(label);
  }

  // Here begin the instructions

  $text() {
    return this.write(this.instruction.text);
  }

  $echo() {
    return this.write('' + evaluate(this.top, this.randomer, this.instruction.expression));
  }

  $br() {
    this.render.break();
    return this.goto(this.instruction.next);
  }

  $par() {
    this.render.paragraph();
    return this.goto(this.instruction.next);
  }

  $rule() {
    // TODO
    this.render.paragraph();
    return this.goto(this.instruction.next);
  }

  $goto() {
    return this.goto(this.instruction.next);
  }

  $call() {
    const label = this.instruction.label;
    const def = this.story[label];
    if (!def) {
      console.error('no such procedure ' + label, this.instruction);
      return this.resume();
    }
    if (def.type !== 'def') {
      console.error("Can't call non-procedure " + label, this.instruction);
      return this.resume();
    }
    if (def.locals.length !== this.instruction.args.length) {
      console.error('Argument length mismatch for ' + label, this.instruction);
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
      def.locals,
      this.instruction.next,
      this.instruction.branch,
      this.label
    );
    for (let i = 0; i < this.instruction.args.length; i++) {
      const arg = this.instruction.args[i];
      const value = evaluate(this.top.parent, this.randomer, arg);
      this.top.set(def.locals[i], value);
    }
    return this.goto(label);
  }

  $def() {
    // Procedure argument instructions exist as targets for labels as well as
    // for reference to locals in calls.
    return this.goto(this.instruction.next);
  }

  $opt() {
    const closure = new Closure(this.top, this.label);
    for (let i = 0; i < this.instruction.keywords.length; i++) {
      const keyword = this.instruction.keywords[i];
      // The first option to introduce a keyword wins, not the last.
      if (!this.keywords[keyword]) {
        this.keywords[keyword] = closure;
      }
    }
    if (this.instruction.question.length > 0) {
      this.options.push(closure);
      this.render.startOption();
      this.top = new Frame(this.top, [], this.instruction.next, 'RET', this.label, true);
      return this.gothrough(this.instruction.question, 'RET');
    } else if (this.noOption == null) {
      this.noOption = closure;
    }
    return this.goto(this.instruction.next);
  }

  $move() {
    const value = evaluate(this.top, this.randomer, this.instruction.source);
    const name = evaluate.nominate(this.top, this.randomer, this.instruction.target);
    if (this.debug) {
      console.log(this.top.at() + '/' + this.label + ' ' + name + ' = ' + value);
    }
    this.top.set(name, value);
    return this.goto(this.instruction.next);
  }

  $jump() {
    const j = this.instruction;
    if (evaluate(this.top, this.randomer, j.condition)) {
      return this.goto(this.instruction.branch);
    } else {
      return this.goto(this.instruction.next);
    }
  }

  $switch() {
    const branches = this.instruction.branches.slice();
    const weightExpressions = this.instruction.weights.slice();
    let samples = 1;
    const nexts = [];
    if (this.instruction.mode === 'pick') {
      samples = evaluate(this.top, this.randomer, this.instruction.expression);
    }
    let value, next;
    for (let i = 0; i < samples; i++) {
      const weights = [];
      const weight = weigh(this.top, this.randomer, weightExpressions, weights);
      if (this.instruction.mode === 'rand' || this.instruction.mode === 'pick') {
        if (weights.length === weight) {
          value = Math.floor(this.randomer.random() * branches.length);
        } else {
          value = pick(weights, weight, this.randomer);
          if (value == null) {
            break;
          }
        }
      } else {
        value = evaluate(this.top, this.randomer, this.instruction.expression);
        if (this.instruction.variable != null) {
          this.top.set(this.instruction.variable, value + this.instruction.value);
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
      console.log(this.top.at() + '/' + this.label + ' ' + value + ' -> ' + next);
    }
    return this.gothrough(nexts, this.instruction.next);
  }

  $cue() {
    if (this.handler != null && this.handler.cue != null) {
      return this.handler.cue(this.instruction.cue, this.instruction.next, this);
    } else {
      return this.goto(this.instruction.next);
    }
  }

  $ask() {
    this.ask();
    return false;
  }

  $read() {
    this.read();
    return false;
  }
};

class Global {
  constructor(handler) {
    this.scope = Object.create(null);
    this.handler = handler;
    this.next = 'RET';
    this.branch = 'RET';
    Object.seal(this);
  }

  get(name) {
    if (this.handler && this.handler.has && this.handler.has(name)) {
      return this.handler.get(name);
    } else {
      return this.scope[name] || 0;
    }
  }

  set(name, value) {
    if (this.handler && this.handler.has && this.handler.has(name)) {
      this.handler.set(name, value);
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
      console.log(name + ' = ' + value);
    }
    console.log('');
  }

  at() {
    return '';
  }

  capture() {
    const names = Object.keys(this.scope);
    const values = [];
    for (let i = 0; i < names.length; i++) {
      values[i] = this.scope[names[i]] || 0;
    }
    return [names, values];
  }
}

class Frame {
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
    const def = engine.story[call.label];
    frame.locals = def.locals;
    for (let i = 0; i < values.length; i++) {
      const name = def.locals[i];
      frame.scope[name] = values[i];
    }

    return frame;
  }

  constructor(parent, locals, next, branch, label, stopOption) {
    this.locals = locals;
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

  get(name) {
    if (this.locals.indexOf(name) >= 0) {
      return this.scope[name];
    }
    return this.parent.get(name);
  }

  set(name, value) {
    if (this.locals.indexOf(name) >= 0) {
      this.scope[name] = value;
      return;
    }
    this.parent.set(name, value);
  }

  log() {
    this.parent.log();
    console.log('--- ' + this.label + ' -> ' + this.next);
    for (let i = 0; i < this.locals.length; i++) {
      const name = this.locals[i];
      const value = this.scope[name];
      console.log(name + ' = ' + value);
    }
  }

  at() {
    return this.parent.at() + '/' + this.label;
  }

  capture(engine) {
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
  constructor(scope, label) {
    this.scope = scope;
    this.label = label;
    Object.seal(this);
  }
}
