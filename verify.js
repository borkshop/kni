'use strict';

const xorshift = require('xorshift');
const Engine = require('./engine');
const Console = require('./console');
const Scanner = require('./scanner');
const OutlineLexer = require('./outline-lexer');
const InlineLexer = require('./inline-lexer');
const Parser = require('./parser');
const Story = require('./story');
const Path = require('./path');
const grammar = require('./grammar');
const link = require('./link');

const verify = (kni, trans, handler, kniscript) => {
  const lines = trans.split('\n');

  // filter the transcript for given answers
  const answers = [];
  for (const line of lines) {
    if (line.lastIndexOf('>', 0) === 0) {
      answers.push(line.slice(1).trim());
    }
  }

  const path = Path.start();
  const base = [];

  // build a story from the kni
  const story = new Story();
  const p = new Parser(grammar.start(story, path, base));
  const il = new InlineLexer(p);
  const ol = new OutlineLexer(il);
  const s = new Scanner(ol, kniscript);

  s.next(kni);
  s.return();

  link(story);

  if (story.errors.length) {
    let errors = '';
    for (const err of story.errors) {
      errors += err + '\n';
    }

    if (errors === trans) {
      return {
        pass: true,
        expected: 'errors',
        actual: 'errors',
      };
    }

    for (const err of story.errors) {
      console.error(err);
    }
    return {
      pass: false,
      expected: trans,
      actual: errors,
    };
  }

  const states = story.states;

  // TODO support alternate seeds
  const seed = 0;
  // I rolled 4d64k this morning, for kni.js
  const randomer = new xorshift.constructor([37615 ^ seed, 54552 ^ seed, 59156 ^ seed, 24695 ^ seed]);

  const writer = new StringWriter();
  const render = new Console(writer);
  const readline = new FakeReadline(writer, answers);
  const engine = new Engine({
    story: states,
    start: 'start',
    handler: handler,
    render: render,
    dialog: readline,
    randomer: randomer,
  });
  readline.engine = engine;
  engine.reset();

  const expected = trans.trim();
  const actual = writer.string.trim();
  return {
    pass: expected === actual,
    expected: expected,
    actual: actual,
  };
};
module.exports = verify;

class FakeReadline {
  constructor(writer, answers) {
    this.writer = writer;
    this.answers = answers;
    this.engine = null;
    this.history = [];
    Object.seal(this);
  }

  ask(_question) {
    var answer = this.answers.shift();
    if (answer == null) {
      return;
    }
    this.writer.write(('> ' + answer).trim() + '\n');

    if (answer === 'quit') {
      // noop
    } else if (answer === 'replay') {
      this.writer.write('\n');
      this.engine.resume(this.engine.waypoint);
    } else if (answer === 'back') {
      this.writer.write('\n');
      this.engine.waypoint = this.history.pop();
      this.engine.resume(this.engine.waypoint);
    } else {
      this.history.push(this.engine.waypoint);
      this.engine.answer(answer);
    }
  }

  close() {}
}

class StringWriter {
  constructor() {
    this.string = '';
  }

  write(string) {
    this.string += string;
  }
}
