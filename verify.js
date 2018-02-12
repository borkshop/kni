'use strict';

var xorshift = require('xorshift');
var Engine = require('./engine');
var Console = require('./console');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var Story = require('./story');
var Path = require('./path');
var grammar = require('./grammar');
var link = require('./link');

module.exports = verify;

function verify(kni, trans, handler) {
    var lines = trans.split('\n');

    // filter the transcript for given answers
    var answers = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.lastIndexOf('>', 0) === 0) {
            answers.push(line.slice(1).trim());
        }
    }

    var path = Path.start();
    var base = [];

    // build a story from the kni
    var story = new Story();
    var p = new Parser(grammar.start(story, path, base));
    var il = new InlineLexer(p);
    var ol = new OutlineLexer(il);
    var s = new Scanner(ol);

    s.next(kni);
    s.return();

    link(story);

    // istanbul ignore if
    if (story.errors.length) {
        for (var i = 0; i < story.errors.length; i++) {
            console.error(story.errors[i]);
        }
        return {
            pass: false,
            expected: 'no errors',
            actual: 'errors'
        };
    }

    var states = story.states;

    // TODO support alternate seeds
    var seed = 0;
    // I rolled 4d64k this morning, for kni.js
    var randomer = new xorshift.constructor([
        37615 ^ seed,
        54552 ^ seed,
        59156 ^ seed,
        24695 ^ seed
    ]);

    var writer = new StringWriter();
    var render = new Console(writer);
    var readline = new FakeReadline(writer, answers);
    var engine = new Engine({
        story: states,
        start: 'start',
        handler: handler,
        render: render,
        dialog: readline,
        randomer: randomer
    });
    readline.engine = engine;
    engine.reset();

    var expected = trans.trim();
    var actual = writer.string.trim();
    return {
        pass: expected === actual,
        expected: expected,
        actual: actual
    };
}

function FakeReadline(writer, answers) {
    this.writer = writer;
    this.answers = answers;
    this.engine = null;
    this.history = [];
    Object.seal(this);
}

FakeReadline.prototype.ask = function ask(question) {
    var answer = this.answers.shift();
    // istanbul ignore if
    if (answer == null) {
        return;
    }
    this.writer.write(((question || '> ') + answer).trim() + '\n');

    if (answer === 'quit') {
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
};

FakeReadline.prototype.close = function close() {
};

function StringWriter() {
    this.string = '';
}

StringWriter.prototype.write = function write(string) {
    this.string += string;
};
