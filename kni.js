#!/usr/bin/env node

import {pathToFileURL} from 'url';
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
import exec from 'shon/exec.js';
import usage from './kni.json' with {type: 'json'};
import xorshift from 'xorshift';
import table from 'table';
import describe from './describe.js';
import makeHtml from './html.js';

const {default: tableDefault, getBorderCharacters} = table;

const run = (args, out, done) => {
  const config = exec(usage, args);
  if (!config) {
    done(null);
    return;
  }

  serial(config.scripts, readAndKeep, (err, kniscripts) => {
    if (err) {
      done(err);
      return;
    }

    let interactive = true;

    if (config.transcript === out) {
      config.transcript = null;
    }
    if (config.transcript) {
      out = tee(config.transcript, out);
    }

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

        let path = Path.start();
        let base = [];
        if (kniscripts.length > 1) {
          path = kniscripts[i].stream.path;
          path = [path.split('/').pop().split('.').shift()];
          base = path;
        }

        const p = new Parser(start(story, path, base));
        const il = new InlineLexer(p);
        const ol = new OutlineLexer(il);
        const s = new Scanner(ol, kniscripts[i].stream.path);

        // Kick off each file with a fresh paragraph.
        p.next('token', '', '//', s);

        if (config.debugParser) {
          p.debug = true;
          interactive = false;
        }
        if (config.debugInlineLexer) {
          il.debug = true;
          interactive = false;
        }
        if (config.debugOutlineLexer) {
          ol.debug = true;
          interactive = false;
        }
        if (config.debugScanner) {
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
        const storyError = new Error('internal story error');
        storyError.story = story;
        done(storyError);
        return;
      }
    }

    if (config.describe) {
      describeStory(states, out, done);
      return;
    }

    if (config.toJson) {
      console.log(JSON.stringify(states, null, 4), done);
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
      // I rolled 4d64k this morning.
      randomer = new xorshift.constructor([
        37615 ^ config.seed,
        54552 ^ config.seed,
        59156 ^ config.seed,
        24695 ^ config.seed,
      ]);
    }

    if (config.expected) {
      read(config.expected, (err, typescript) => {
        if (err) {
          done(err);
          return;
        }

        const result = verify(kniscripts[0].content, typescript);
        if (!result.pass) {
          console.log(result.actual);
          done(new Error('verification failed'));
          return;
        }
      });
      done(null);
      return;
    }

    if (interactive) {
      const readline = new Readline(config.transcript);
      const render = new Console(out);
      const engine = new Engine({
        story: states,
        start: config.start,
        render: render,
        dialog: readline,
        randomer: randomer,
      });

      if (config.debugRuntime) {
        engine.debug = true;
      }

      if (config.waypoint) {
        read(config.waypoint, (err, waypoint) => {
          if (err) {
            done(err);
            return;
          }
          waypoint = JSON.parse(waypoint);
          engine.continue(waypoint);
        });
      } else {
        engine.continue();
      }
    }
  });

  done(null);
};

const describeStory = (states, out, done) => {
  const keys = Object.keys(states);
  const cells = [['L:C', 'AT', 'DO', 'S', 'USING', 'S', 'GO']];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const node = states[key];
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
    done
  );
};

const stripe = (index, text) => {
  if (index % 2 === 1) {
    return text;
  } else {
    return `\x1b[90m${text}\x1b[0m`;
  }
};

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

const no = () => {
  return false;
};

const readAndKeep = (stream, callback) => {
  read(stream, (err, content) => {
    if (err != null) {
      return callback(err);
    }
    callback(null, {stream: stream, content: content});
  });
};

const read = (stream, callback) => {
  stream.setEncoding('utf8');
  let string = '';
  const onData = chunk => {
    string += chunk;
  };
  const onEnd = err => {
    if (err) {
      callback(err);
      return;
    }
    callback(null, string);
  };
  stream.on('data', onData);
  stream.on('end', onEnd);
  stream.on('error', onEnd);
};

const serial = (array, eachback, callback) => {
  const values = [];
  const next = i => {
    if (i >= array.length) {
      return callback(null, values);
    }

    eachback(array[i], (err, value) => {
      if (err != null) {
        return callback(err, null);
      }
      values.push(value);
      next(i + 1);
    });
  };
  next(0);
};

const dump = (errors, writer) => {
  for (let i = 0; i < errors.length; i++) {
    writer.write(`${errors[i]}\n`);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(null, process.stdout, err => {
    if (err) {
      console.error(typeof err === 'object' && err.message ? err.message : err);
      if (typeof err.story === 'object' && err.story) {
        const story = err.story;
        dump(story.errors, process.stderr);
      }
      process.exit(-1);
    }
  });
}

export default run;
