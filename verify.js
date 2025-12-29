// @ts-ignore - no types
import xorshift from 'xorshift';
import Engine from './engine.js';
import Console from './console.js';
import Scanner from './scanner.js';
import OutlineLexer from './outline-lexer.js';
import InlineLexer from './inline-lexer.js';
import Parser from './parser.js';
import Story from './story.js';
import * as Path from './path.js';
import start from './grammar.js';
import link from './link.js';

/**
 * @typedef {object} VerifyResult
 * @prop {boolean} pass
 * @prop {string} expected
 * @prop {string} actual
 */

/**
 * Verifies a kni script against an expected transcript.
 * @param {string} kni
 * @param {string} trans
 * @param {any} [handler]
 * @param {string} [kniscript]
 * @returns {VerifyResult}
 */
const verify = (kni, trans, handler, kniscript) => {
  const lines = trans.split('\n');

  // filter the transcript for given answers
  /** @type {string[]} */
  const answers = [];
  for (const line of lines) {
    if (line.lastIndexOf('>', 0) === 0) {
      answers.push(line.slice(1).trim());
    }
  }

  const path = Path.start();
  /** @type {import('./path.js').Path} */
  const base = /** @type {import('./path.js').Path} */ (/** @type {unknown} */ ([]));

  // build a story from the kni
  const story = new Story();
  const p = new Parser(start(story, path, base));
  const il = new InlineLexer(p);
  const ol = new OutlineLexer(il);
  const s = new Scanner(ol, kniscript || '-');

  s.next(kni);
  s.return();

  link(story);

  if (story.errors.length) {
    let errors = '';
    for (const err of story.errors) {
      errors += `${err}\n`;
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
  // @ts-ignore - xorshift constructor
  const randomer = new xorshift.constructor([
    37615 ^ seed,
    54552 ^ seed,
    59156 ^ seed,
    24695 ^ seed,
  ]);

  const writer = new StringWriter();
  const render = new Console(writer);
  const readline = new FakeReadline(writer, answers, kniscript || '-');
  const engine = new Engine({
    story: states,
    start: 'start',
    handler: handler,
    render: render,
    // @ts-ignore - FakeReadline implements Dialog partially
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

export default verify;

class FakeReadline {
  /**
   * @param {StringWriter} writer
   * @param {string[]} answers
   * @param {string} kniscript
   */
  constructor(writer, answers, kniscript) {
    this.writer = writer;
    this.answers = answers;
    this.kniscript = kniscript;
    /** @type {Engine | null} */
    this.engine = null;
    /** @type {any[]} */
    this.history = [];
    Object.seal(this);
  }

  /**
   * @param {string} [_question]
   */
  ask(_question) {
    const answer = this.answers.shift();
    if (answer == null) {
      return;
    }
    this.writer.write(`${`> ${answer}`.trim()}\n`);

    if (!this.engine) return;

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

  meterFault() {
    throw new Error(`meter fault in ${this.kniscript}`);
  }
}

class StringWriter {
  constructor() {
    this.string = '';
  }

  /**
   * @param {string} string
   */
  write(string) {
    this.string += string;
  }
}
