/** @import { default as Scanner } from './scanner' */

/**
 * State interface for the parser trampoline.
 * Each state must return the next state when given a token.
 *
 * @typedef {object} State
 * @prop {(type: string, space: string, text: string, sc: Scanner) => State} next
 */

/**
 * Parser is a trampoline that advances a state machine with tokens.
 * It delegates to InlineLexer for tokenization.
 */
export default class Parser {
  debug = typeof process === 'object' && process.env.DEBUG_PARSER;

  /**
   * @param {State} generator
   */
  constructor(generator) {
    this.generator = generator;
  }

  /**
   * @param {string} type
   * @param {string} space
   * @param {string} text
   * @param {Scanner} scanner
   * @returns {Parser}
   */
  next(type, space, text, scanner) {
    const prior = this.generator.constructor.name;
    this.generator = this.generator.next(type, space, text, scanner);
    if (this.debug) {
      console.error(
        'PAR',
        scanner.position(),
        type,
        JSON.stringify(text),
        `${prior}->${this.generator.constructor.name}`
      );
    }
    return this;
  }
}
