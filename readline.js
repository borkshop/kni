import * as readline from 'readline';
import * as fs from 'fs';

/** @import { default as Engine } from './engine' */

/**
 * @typedef {object} Writer
 * @prop {(text: string) => void} write
 */

/**
 * @typedef {object} ReadlineState
 * @prop {(text: string) => ReadlineState} answer
 * @prop {(filename: string) => ReadlineState} [saved]
 * @prop {(waypoint: any) => ReadlineState} [loaded]
 */

export default class Readline {
  /**
   * @param {Writer} [transcript]
   * @param {string} [filename]
   */
  constructor(transcript, filename) {
    const self = this;
    this.readline = /** @type {readline.Interface} */ (
      readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
    );
    /** @type {Engine | null} */
    this.engine = null;
    /** @type {(text: string) => void} */
    this.boundAnswer = text => {
      self.answer(text);
    };
    /** @type {Writer | undefined} */
    this.transcript = transcript;
    /** @type {any[]} */
    this.history = [];
    /** @type {ReadlineState} */
    this.state = new Play(this, filename);
    Object.seal(this);
  }

  meterFault() {
    this.readline.question(`Enter any command to continue... `, answer => {
      if (answer === 'quit') {
        this.close();
      } else {
        if (!this.engine) {
          throw new Error('engine not initialized');
        }
        this.engine.clearMeterFault();
      }
    });
  }

  /**
   * @param {string} [cue]
   */
  ask(cue) {
    this.readline.question(`${cue || ''}> `, this.boundAnswer);
  }

  /**
   * @param {string} text
   */
  answer(text) {
    if (this.transcript) {
      this.transcript.write(`> ${text}\n`);
    }
    this.state = this.state.answer(text);
  }

  close() {
    if (this.transcript) {
      this.transcript.write('\n');
    }
    this.readline.close();
  }
}

/**
 * @implements {ReadlineState}
 */
class Play {
  /**
   * @param {Readline} readline
   * @param {string} [filename]
   */
  constructor(readline, filename) {
    this.readline = readline;
    this.filename = filename || 'kni.waypoint';
  }

  /**
   * @returns {Engine}
   */
  get engine() {
    if (!this.readline.engine) {
      throw new Error('engine not initialized');
    }
    return this.readline.engine;
  }

  /**
   * @param {string} text
   * @returns {ReadlineState}
   */
  answer(text) {
    const engine = this.engine;

    if (text === 'quit') {
      console.log('');
      engine.dialog.close();
    } else if (text === 'bt' || text === 'trace') {
      engine.log();
      engine.ask();
    } else if (text === 'capture' || text === 'cap') {
      console.log(JSON.stringify(engine.waypoint));
      console.log('');
      engine.ask();
    } else if (text === 'save') {
      console.log('');
      engine.dialog.ask(`file name [${this.filename}]> `);
      return new Save(this, engine.waypoint, this.filename);
    } else if (text === 'load') {
      console.log('');
      engine.dialog.ask(`file name [${this.filename}]> `);
      return new Load(this, this.filename);
    } else if (text === 'back') {
      console.log('');
      if (this.readline.transcript) {
        this.readline.transcript.write('\n');
      }
      if (this.readline.history.length <= 1) {
        console.log('Meanwhile, at the beginning of recorded history...');
      }
      engine.waypoint = this.readline.history.pop();
      engine.resume(engine.waypoint);
    } else if (text === 'replay') {
      console.log('');
      if (this.readline.transcript) {
        this.readline.transcript.write('\n');
      }
      engine.resume(engine.waypoint);
    } else {
      this.readline.history.push(engine.waypoint);
      engine.answer(text);
    }
    return this;
  }

  /**
   * @param {string} filename
   * @returns {ReadlineState}
   */
  saved(filename) {
    this.filename = filename;
    this.engine.ask();
    return this;
  }

  /**
   * @param {any} waypoint
   * @returns {ReadlineState}
   */
  loaded(waypoint) {
    this.engine.resume(waypoint);
    return this;
  }
}

class Save {
  /**
   * @param {Play} parent
   * @param {any} waypoint
   * @param {string} filename
   */
  constructor(parent, waypoint, filename) {
    this.parent = parent;
    this.waypoint = waypoint;
    this.filename = filename;
  }

  /**
   * @param {string} filename
   * @returns {ReadlineState}
   */
  answer(filename) {
    const waypoint = JSON.stringify(this.waypoint);
    filename = filename || this.filename;
    fs.writeFileSync(filename, waypoint, 'utf8');

    console.log('');
    console.log(`Waypoint written to ${filename}`);
    console.log(waypoint);
    console.log('');
    return this.parent.saved ? this.parent.saved(filename) : this.parent;
  }
}

class Load {
  /**
   * @param {Play} parent
   * @param {string} filename
   */
  constructor(parent, filename) {
    this.parent = parent;
    this.filename = filename;
  }

  /**
   * @param {string} filename
   * @returns {ReadlineState}
   */
  answer(filename) {
    filename = filename || this.filename;

    const waypoint = fs.readFileSync(filename, 'utf8');
    console.log('');
    console.log(`Loaded from ${filename}`);
    console.log(waypoint);
    console.log('');

    return this.parent.loaded ? this.parent.loaded(JSON.parse(waypoint)) : this.parent;
  }
}
