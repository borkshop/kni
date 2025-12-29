#!/usr/bin/env node

import {pathToFileURL} from 'url';
// @ts-ignore - no types
import tee from 'tee';
import Console from './console.js';
import Readline from './readline.js';
import Engine from './engine.js';
import Scanner from './scanner.js';
import OutlineLexer from './outline-lexer.js';
import InlineLexer from './inline-lexer.js';
import Parser from './parser.js';
import Story from './story.js';
import * as Path from './path.js';
import start from './grammar.js';
import link from './link.js';
import verify from './verify.js';
// @ts-ignore - no types
import exec from 'shon/exec.js';
// @ts-ignore - json import
import usage from './kni.json' with {type: 'json'};
// @ts-ignore - no types
import xorshift from 'xorshift';
// @ts-ignore - no types
import table from 'table';
import describe from './describe.js';
import makeHtml from './html.js';

// @ts-ignore - table export
const {default: tableDefault, getBorderCharacters} = table;

/**
 * @typedef {object} KniConfig
 * @prop {any[]} scripts
 * @prop {any} [transcript]
 * @prop {boolean} [fromJson]
 * @prop {boolean} [debugInput]
 * @prop {boolean} [debugParser]
 * @prop {boolean} [debugInlineLexer]
 * @prop {boolean} [debugOutlineLexer]
 * @prop {boolean} [debugScanner]
 * @prop {boolean} [debugRuntime]
 * @prop {boolean} [describe]
 * @prop {boolean} [toJson]
 * @prop {any} [toHtml]
 * @prop {string} [htmlTitle]
 * @prop {string} [htmlColor]
 * @prop {string} [htmlBackgroundColor]
 * @prop {string} [start]
 * @prop {any} [expected]
 * @prop {any} [waypoint]
 * @prop {number} [seed]
 */

/**
 * @typedef {object} Writer
 * @prop {(text: string, cb?: (err: Error | null) => void) => void} write
 */

/**
 * @typedef {object} KniScript
 * @prop {any} stream
 * @prop {string} content
 */

/**
 * @param {string[] | null} args
 * @param {Writer} out
 * @returns {Promise<void>}
 */
const run = async (args, out) => {
  /** @type {KniConfig | null} */
  const config = exec(usage, args);
  if (!config) {
    return;
  }

  const kniscripts = await serial(config.scripts, readAndKeep);
  if (!kniscripts || kniscripts.length === 0) {
    throw new Error('No scripts');
  }

  let interactive = true;

  if (config.transcript === out) {
    config.transcript = null;
  }
  if (config.transcript) {
    out = tee(config.transcript, out);
  }

  /** @type {Record<string, any>} */
  let states;
  if (config.fromJson) {
    states = JSON.parse(kniscripts[0].content); // TODO test needed
  } else {
    const story = new Story();

    for (let i = 0; i < kniscripts.length; i++) {
      const kniscript = kniscripts[i].content;

      if (config.debugInput) {
        console.log(kniscript);
      }

      /** @type {import('./path.js').Path} */
      let path = Path.start();
      /** @type {import('./path.js').Path} */
      let base = /** @type {import('./path.js').Path} */ (/** @type {unknown} */ ([]));
      if (kniscripts.length > 1) {
        /** @type {string} */
        const streamPath = kniscripts[i].stream.path;
        const pathPart = streamPath.split('/').pop()?.split('.').shift() || '';
        path = [pathPart];
        base = path;
      }

      const p = new Parser(start(story, path, base));
      const il = new InlineLexer(p);
      const ol = new OutlineLexer(il);
      const s = new Scanner(ol, kniscripts[i].stream.path);

      // Kick off each file with a fresh paragraph.
      p.next('token', '', '//', s);

      if (config.debugParser) {
        // @ts-ignore - debug property exists
        p.debug = true;
        interactive = false;
      }
      if (config.debugInlineLexer) {
        // @ts-ignore - debug property exists
        il.debug = true;
        interactive = false;
      }
      if (config.debugOutlineLexer) {
        // @ts-ignore - debug property exists
        ol.debug = true;
        interactive = false;
      }
      if (config.debugScanner) {
        // @ts-ignore - debug property exists
        s.debug = true;
        interactive = false;
      }

      s.next(kniscript);
      s.return();
    }

    link(story);

    states = story.states;
    if (story.errors.length) {
      if (config.transcript != null) {
        dump(story.errors, config.transcript);
      }
      /** @type {Error & {story?: Story}} */
      const storyError = new Error('internal story error');
      storyError.story = story;
      throw storyError;
    }
  }

  if (config.describe) {
    await describeStory(states, out);
    return;
  }

  if (config.toJson) {
    console.log(JSON.stringify(states, null, 4));
    interactive = false;
  } else if (config.toHtml) {
    makeHtml(states, config.toHtml, {
      title: config.htmlTitle,
      color: config.htmlColor,
      backgroundColor: config.htmlBackgroundColor,
    });
    interactive = false;
  }

  let randomer = xorshift;

  if (config.transcript || config.seed) {
    const seed = config.seed || 0;
    // I rolled 4d64k this morning.
    // @ts-ignore - xorshift constructor
    randomer = new xorshift.constructor([37615 ^ seed, 54552 ^ seed, 59156 ^ seed, 24695 ^ seed]);
  }

  if (config.expected) {
    const typescript = await read(config.expected);
    if (!typescript) {
      throw new Error('No expected content');
    }

    const result = verify(kniscripts[0].content, typescript);
    if (!result.pass) {
      console.log(result.actual);
      throw new Error('verification failed');
    }
    return;
  }

  if (interactive) {
    const rl = new Readline(config.transcript);
    const render = new Console(out);
    const engine = new Engine({
      story: states,
      start: config.start,
      render: render,
      // @ts-ignore - Readline implements Dialog partially
      dialog: rl,
      randomer: randomer,
    });

    if (config.debugRuntime) {
      // @ts-ignore - debug property exists
      engine.debug = true;
    }

    if (config.waypoint) {
      const waypoint = await read(config.waypoint);
      if (waypoint) {
        const parsed = JSON.parse(waypoint);
        engine.resume(parsed);
      }
    } else {
      engine.continue();
    }
    // Interactive mode - don't resolve, the engine will handle termination
    return;
  }

  // Non-interactive, non-describe path (e.g., toJson, toHtml)
};

/**
 * @param {Record<string, any>} states
 * @param {Writer} out
 * @returns {Promise<void>}
 */
const describeStory = (states, out) => {
  return new Promise((resolve, reject) => {
    const keys = Object.keys(states);
    /** @type {string[][]} */
    const cells = [['L:C', 'AT', 'DO', 'S', 'USING', 'S', 'GO']];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const node = states[key];
      /** @type {string | null} */
      let next;
      if (i === keys.length - 1) {
        next = null;
      } else {
        next = keys[i + 1];
      }
      cells.push([
        stripe(i, node.position),
        stripe(i, key),
        stripe(i, node.mode || node.type),
        stripe(i, node.lift ? '-' : ' '),
        stripe(i, describe(node)),
        stripe(i, node.drop ? '-' : ' '),
        stripe(i, describeNext(node.next, next)),
      ]);
    }
    out.write(
      tableDefault(cells, {
        border: getBorderCharacters('void'),
        columnDefault: {
          paddingLeft: 0,
          paddingRight: 2,
        },
        columns: {
          4: {
            width: 40,
            wrapWord: true,
          },
        },
        drawHorizontalLine: no,
      }),
      /** @param {Error | null} err */
      err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

/**
 * @param {number} index
 * @param {string} text
 * @returns {string}
 */
const stripe = (index, text) => {
  if (index % 2 === 1) {
    return text;
  } else {
    return `\x1b[90m${text}\x1b[0m`;
  }
};

/**
 * @param {string | undefined} jump
 * @param {string | null} next
 * @returns {string}
 */
const describeNext = (jump, next) => {
  if (jump === undefined) {
    return '';
  } else if (jump === next) {
    return '';
  } else if (jump == 'RET') {
    return '<-';
  } else if (jump == 'ESC') {
    return '<<';
  } else {
    return `-> ${jump}`;
  }
};

/**
 * @returns {boolean}
 */
const no = () => {
  return false;
};

/**
 * @param {any} stream
 * @returns {Promise<KniScript>}
 */
const readAndKeep = async stream => {
  const content = await read(stream);
  return {stream, content: content || ''};
};

/**
 * @param {any} stream
 * @returns {Promise<string>}
 */
const read = stream => {
  return new Promise((resolve, reject) => {
    stream.setEncoding('utf8');
    let string = '';
    /** @param {string} chunk */
    const onData = chunk => {
      string += chunk;
    };
    /** @param {Error | null} [err] */
    const onEnd = err => {
      if (err) {
        reject(err);
        return;
      }
      resolve(string);
    };
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onEnd);
  });
};

/**
 * @template T
 * @param {any[]} array
 * @param {(item: any) => Promise<T>} eachback
 * @returns {Promise<T[]>}
 */
const serial = async (array, eachback) => {
  /** @type {T[]} */
  const values = [];
  for (const item of array) {
    const value = await eachback(item);
    if (value !== undefined) {
      values.push(value);
    }
  }
  return values;
};

/**
 * @param {string[]} errors
 * @param {Writer} writer
 */
const dump = (errors, writer) => {
  for (let i = 0; i < errors.length; i++) {
    writer.write(`${errors[i]}\n`);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(null, /** @type {Writer} */ (/** @type {unknown} */ (process.stdout))).catch(err => {
    console.error(typeof err === 'object' && err.message ? err.message : err);
    /** @type {any} */
    const errWithStory = err;
    if (typeof errWithStory.story === 'object' && errWithStory.story) {
      const story = errWithStory.story;
      dump(story.errors, /** @type {Writer} */ (/** @type {unknown} */ (process.stderr)));
    }
    process.exit(-1);
  });
}

export default run;
