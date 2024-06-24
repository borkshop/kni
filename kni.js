#!/usr/bin/env node
'use strict';

var tee = require('tee');
var Console = require('./console');
var Readline = require('./readline');
var Engine = require('./engine');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var Story = require('./story');
var Path = require('./path');
var grammar = require('./grammar');
var link = require('./link');
var verify = require('./verify');
var exec = require('shon/exec');
var usage = require('./kni.json');
var xorshift = require('xorshift');
var table = require('table').default;
var getBorderCharacters = require('table').getBorderCharacters;
var describe = require('./describe');
var makeHtml = require('./html');

function run(args, out, done) {
    var config = exec(usage, args);
    if (!config) {
        done(null);
        return;
    }

    serial(config.scripts, readAndKeep, onKniscripts);

    function onKniscripts(err, kniscripts) {
        if (err) {
            done(err);
            return;
        }

        var interactive = true;

        if (config.transcript === out) {
            config.transcript = null;
        }
        if (config.transcript) {
            out = tee(config.transcript, out);
        }

        var kniscript;
        var states;

        if (config.fromJson) {
            if (kniscripts.length !== 1) {
                done(new Error('must provide (only) one JSON input file'));
                return;
            }
            try {
                kniscript = kniscripts[0].content;
                states = JSON.parse(kniscript);
            } catch (err) {
                done(err);
                return;
            }
        } else {
            var story = new Story();

            for (var i = 0; i < kniscripts.length; i++) {
                kniscript = kniscripts[i].content;

                if (config.debugInput) {
                    console.log(kniscript);
                }

                var path = Path.start();
                var base = [];
                if (kniscripts.length > 1) {
                    path = kniscripts[i].stream.path;
                    path = [path.split('/').pop().split('.').shift()];
                    base = path;
                }

                var p = new Parser(grammar.start(story, path, base));
                var il = new InlineLexer(p);
                var ol = new OutlineLexer(il);
                var s = new Scanner(ol, kniscripts[i].stream.path);

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
                var storyError = new Error('internal story error');
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
            // TODO streaming json encoder?
            out.write(JSON.stringify(states, null, 4), done);
            return;
        }

        if (config.toHtml) {
            makeHtml(states, config.toHtml, {
                title: config.htmlTitle,
                color: config.htmlColor,
                backgroundColor: config.htmlBackgroundColor,
            });
            interactive = false;
        }

        var randomer = xorshift;

        if (config.transcript || config.seed) {
            // I rolled 4d64k this morning.
            randomer = new xorshift.constructor([
                37615 ^ config.seed,
                54552 ^ config.seed,
                59156 ^ config.seed,
                24695 ^ config.seed
            ]);
        }

        if (config.expected) {
            read(config.expected, function onTypescript(err, typescript) {
                if (err) {
                    done(err);
                    return;
                }

                var result = verify(kniscript, typescript);
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

            if (config.waypoint) {
                read(config.waypoint, function onWaypoint(err, waypoint) {
                    if (err) {
                        done(err);
                        return;
                    }
                    try {
                        waypoint = JSON.parse(waypoint);
                    } catch (err) {
                        done(err);
                        return;
                    }
                    engine.continue(waypoint);
                });
            } else {
                engine.continue();
            }
        }
    }

    done(null);
}

function describeStory(states, out, done) {
    var keys = Object.keys(states);
    var cells = [['L:C', 'AT', 'DO', 'S', 'USING', 'S', 'GO']];
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var node = states[key];
        var next;
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
            stripe(i, describeNext(node.next, next))
        ]);
    }
    out.write(table(cells, {
        border: getBorderCharacters('void'),
        columnDefault: {
            paddingLeft: 0,
            paddingRight: 2
        },
        columns: {
            4: {
                width: 40,
                wrapWord: true
            }
        },
        drawHorizontalLine: no
    }), done);
}

function stripe(index, text) {
    if (index % 2 === 1) {
        return text;
    } else {
        return '\x1b[90m' + text + '\x1b[0m';
    }
}

function describeNext(jump, next) {
    if (jump === undefined) {
        return '';
    } else if (jump === next) {
        return '';
    } else if (jump == 'RET') {
        return '<-';
    } else if (jump == 'ESC') {
        return '<<';
    } else {
        return '-> ' + jump;
    }
}

function no() {
    return false;
}

function readAndKeep(stream, callback) {
    read(stream, function onRead(err, content) {
        if (err != null) {
            return callback(err);
        }
        callback(null, {stream: stream, content: content});
    });
}

function read(stream, callback) {
    stream.setEncoding('utf8');
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

function serial(array, eachback, callback) {
    var values = [];
    next(0);

    function next(i) {
        if (i >= array.length) {
            return callback(null, values);
        }

        eachback(array[i], onEach);

        function onEach(err, value) {
            if (err != null) {
                return callback(err, null);
            }
            values.push(value);
            next(i+1);
        }
    }
}

function dump(errors, writer) {
    for (var i = 0; i < errors.length; i++) {
        writer.write(errors[i] + '\n');
    }
}

if (require.main === module) {
    run(null, process.stdout, function runDone(err) {
        if (err) {
            console.error(typeof err === 'object' && err.message ? err.message : err);
            if (typeof err.story === 'object' && err.story) {
                var story = err.story;
                dump(story.errors, process.stderr);
            }
            process.exit(-1);
        }
    });
} else {
    module.exports = run;
}
