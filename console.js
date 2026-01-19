import Excerpt from './excerpt.js';
import Wrapper from './wrapper.js';

/**
 * @typedef {object} Writer
 * @prop {(text: string) => void} write
 */

/**
 * Console renderer for terminal output.
 */
export default class Console {
  /**
   * @param {Writer} writer
   */
  constructor(writer) {
    this.writer = writer;
    this.wrapper = new Wrapper(writer);
    this.excerpt = new Excerpt();
    /** @type {Excerpt[]} */
    this.options = [];
    /** @type {Excerpt} */
    this.cursor = this.excerpt;
  }

  /**
   * @param {string} lift
   * @param {string} text
   * @param {string} drop
   */
  write(lift, text, drop) {
    this.cursor.digest(lift, text, drop);
  }

  break() {
    this.cursor.break();
  }

  paragraph() {
    this.cursor.paragraph();
  }

  startOption() {
    const option = new Excerpt();
    this.cursor = option;
    this.options.push(option);
  }

  stopOption() {
    this.cursor = this.excerpt;
  }

  flush() {
    this.writer.write('\n');
  }

  pardon() {
    this.writer.write('?\n');
  }

  display() {
    this.excerpt.write(this.wrapper);
    for (let i = 0; i < this.options.length; i++) {
      const number = i + 1;
      const lead = `${`${number}.   `.slice(0, 3)} `;
      this.wrapper.word(lead);
      this.wrapper.flush = true;
      this.wrapper.push('    ', '   ');
      this.options[i].write(this.wrapper);
      this.wrapper.pop();
    }
  }

  clear() {
    this.excerpt = new Excerpt();
    this.options = [];
    this.cursor = this.excerpt;
  }
}
