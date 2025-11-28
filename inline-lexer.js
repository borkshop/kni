// @ts-check
'use strict';

// Receives a stream of start, stop, and text tokens from an outline lexer and
// produces a more comprehensive stream of tokens by breaking text tokens into
// constituent text and operator tokens.
// For example, "= hi -> hi" would break into four tokens.
//
// The token stream ultimately drives a parser state machine.
// The `next` method of the parse state must return another parse state.
// Each parse state must capture the syntax tree and graph of incomplete parse
// states.
// The final parse state captures the entire syntax tree.

const L1 = '@[]{}|/<>';
const L2 = ['->', '<-', '==', '<>', '>=', '<=', '{"', '"}', "{'", "'}", '//', '**'];
const num = /\d/;

// alphanumerics including non-english
const alpha = /[\w\u00C0-\u1FFF\u2C00-\uD7FF\d_]/;

/** Receives outline tokens, passing through inter-line structure tokens, and
 * decomposing line tokens along with interstitial space tracking.
 */
module.exports = class InlineLexer {
  debug = typeof process === 'object' && process.env.DEBUG_INLINE_LEXER;

  space = '';
  accumulator = '';
  type = 'symbol';

  /** @typedef {import('./scanner')} Scanner */

  /** Inline lexer state object, which receives typed text tokens along with
   * any preceding collapsed space, and the current scanner.
   *
   * NOTE: unlike the upstream OutlineLexer.State monad, which
   * InlineLexer.next implements, this is not quite a state monad, as it does
   * not support subsequent state chaining; in practice, that is implemented
   * by Parser. This curious decoupling stands in interesting contrast to the
   * outline layer having coupled together the iterator callback interface
   * with state retention and chaining.
   *
   * @typedef {object} State
   * @prop {(type: string, space: string, text: string, sc: Scanner) => void} next
   */

  /**
   * @param {State} generator
   */
  constructor(generator) {
    this.generator = generator;
  }

  /**
   * @param {string} type
   * @param {string} text
   * @param {Scanner} scanner
   */
  next(type, text, scanner) {
    if (this.debug) {
      console.log('ILL', type, JSON.stringify(text));
    }

    if (type !== 'text') {
      this.flush(scanner);
      this.generator.next(type, ' ', text, scanner);
      this.space = '';
      return this;
    }

    let wrap = false;
    let i = 0;
    for (; i < text.length - 1; i++) {
      let c = text[i];
      const d = text[i + 1];
      const cd = c + d;
      const numeric = num.test(c);
      const alphanum = alpha.test(c);
      if (c === ' ' || c === '\t') {
        this.flush(scanner);
        this.space = ' ';
      } else if (cd === '\\ ') {
        // Scan forward to end of line until encountering a non-space
        // character.
        for (i = i + 2; i < text.length; i++) {
          c = text[i];
          if (c !== ' ' && c !== '\t') {
            i--;
            break;
          }
        }
        if (i === text.length) {
          // If everything after \ is whitespace, then treat it as if
          // there is no whitespace, meaning that the \ means continue
          // through next line.
          wrap = true;
        } else {
          // Otherwise, treat all following space as a single space.
          this.flush(scanner);
          this.generator.next('literal', '', ' ', scanner);
          this.space = '';
        }
      } else if (c === '\\') {
        // TODO account for escaped space through to the end of line
        this.flush(scanner);
        this.generator.next('literal', this.space, d, scanner);
        this.space = '';
        i++;
      } else if (L2.indexOf(cd) >= 0) {
        this.flush(scanner);
        this.generator.next('token', this.space, cd, scanner);
        this.space = '';
        i++;
      } else if (L1.indexOf(c) >= 0) {
        this.flush(scanner);
        this.generator.next('token', this.space, c, scanner);
        this.space = '';
      } else if (cd === '--') {
        this.flush(scanner);
        let j = i + 2;
        for (; j < text.length; j++) {
          c = text[j];
          if (c !== '-') {
            break;
          }
        }
        this.generator.next('dash', this.space, text.slice(i, j), scanner);
        i = j - 1;
      } else if (this.type !== 'alphanum' && numeric) {
        if (this.type != 'number') {
          this.flush(scanner);
        }
        this.accumulator += c;
        this.type = 'number';
      } else if (alphanum) {
        if (this.type != 'alphanum') {
          this.flush(scanner);
        }
        this.accumulator += c;
        this.type = 'alphanum';
      } else {
        this.flush(scanner);
        this.generator.next(this.type, this.space, c, scanner);
        this.space = '';
      }
    }

    if (i < text.length) {
      const c = text[i];
      const numeric = num.test(c);
      const alphanum = alpha.test(c);
      if (c === '\\') {
        wrap = true;
      } else if (c === ' ' || c === '\t') {
        // noop
      } else if (L1.indexOf(c) >= 0) {
        this.flush(scanner);
        this.generator.next('token', this.space, c, scanner);
      } else if (this.type !== 'alphanum' && numeric) {
        if (this.type !== 'number') {
          this.flush(scanner);
        }
        this.accumulator += c;
        this.type = 'number';
      } else if (!alphanum) {
        this.flush(scanner);
        this.generator.next(this.type, this.space, c, scanner);
      } else {
        this.type = 'alphanum';
        this.accumulator += c;
      }
    }

    if (!wrap) {
      this.flush(scanner);
      this.space = ' ';
    }
    return this;
  }

  /**
   * @param {Scanner} scanner
   */
  flush(scanner) {
    if (this.accumulator) {
      this.generator.next(this.type, this.space, this.accumulator, scanner);
      this.accumulator = '';
      this.space = '';
      this.type = 'symbol';
    }
  }
};
