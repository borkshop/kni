#!/usr/bin/env node
'use strict';

var fs = require('fs');
var tee = require('tee');
var Console = require('./console');
var Readline = require('./readline');
var Engine = require('./engine');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var Story = require('./story');
var grammar = require('./grammar');
var verify = require('./verify');
var exec = require('shon/exec');
var usage = require('./inkblot.json');
var xorshift = require('xorshift');
var table = require('table').default;
var getBorderCharacters = require('table').getBorderCharacters;

function main() {
    var config = exec(usage);

    if (!config) {
        return;
    }

    read(config.script, 'utf8', onInkscript);

    function onInkscript(err, inkscript) {
        if (err) {
            console.error(err.message);
            process.exit(-1);
            return;
        }

        if (config.debugInput) {
            console.log(inkscript);
        }

        var interactive = true;

        var states;
        if (config.fromJson) {
            states = JSON.parse(inkscript);

        } else {
            var story = new Story();

            var p = new Parser(grammar.start(story));
            var il = new InlineLexer(p);
            var ol = new OutlineLexer(il);
            var s = new Scanner(ol);

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

            s.next(inkscript);
            s.return();
            states = story.states;
        }

        if (config.describe) {
            describe(states);
            interactive = false;

        } else if (config.toJson) {
            console.log(JSON.stringify(states, null, 4));
            interactive = false;
        }

        var randomer = xorshift;
        var out = process.stdout;
        var transcript;

        if (config.transcript === process.stdout) {
            config.transcript = null;
        }

        if (config.transcript) {
            out = tee(config.transcript, out);
        }
        if (config.transcript || config.seed) {
            // I rolled 4d64k this morning.
            randomer = new xorshift.constructor([
                37615 ^ config.seed,
                54552 ^ config.seed,
                59156 ^ config.seed,
                24695 ^ config.seed
            ]);
        }

        if (config.expected === process.stdin) {
            config.expected = null;
        }

        if (config.expected) {
            read(config.expected, 'utf8', function onTypescript(err, typescript) {
                if (err) {
                    console.error(err.message);
                    process.exit(-1);
                    return;
                }
                test(inkscript, typescript);
            });
            return;
        }

        if (interactive) {
            var readline = new Readline(config.transcript);
            var render = new Console(out);
            var engine = new Engine({
                story: states,
                start: config.start,
                render: render,
                dialog: readline,
                randomer: randomer
            });

            if (config.debugRuntime) {
                engine.debug = true;
            }

            engine.continue();
        }
    }

}

function test(inkscript, typescript) {
    var result = verify(inkscript, typescript);
    if (!result.pass) {
        console.log(result.actual);
        process.exit(1);
    }
}

function describe(states) {
    var keys = Object.keys(states);
    var cells = [];
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var node = states[key];
        cells.push([key, node.type, node.describe(), node.next]);
    }
    console.log(table(cells, {
        border: getBorderCharacters('void'),
        columnDefault: {
            paddingLeft: 0,
            paddingRight: 2
        },
        drawHorizontalLine: no
    }));
}

function no() {
    return false;
}

function read(stream, encoding, callback) {
    stream.setEncoding(encoding);
    var string = '';
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onEnd);
    function onData(chunk) {
        string += chunk;
    }
    function onEnd(err) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, string);
    }
}

main();

