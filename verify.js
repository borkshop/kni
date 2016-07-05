'use strict';

var xorshift = require('xorshift');
var Engine = require('./engine');
var Console = require('./console');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var Story = require('./story');
var grammar = require('./grammar');

module.exports = verify;

function verify(ink, trans) {
    var lines = trans.split('\n');

    // filter the transcript for given answers
    var answers = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.lastIndexOf('> ', 0) === 0) {
            answers.push(line.slice(2));
        }
    }

    // build a story from the ink
    var story = new Story();
    var p = new Parser(grammar.start(story));
    var il = new InlineLexer(p);
    var ol = new OutlineLexer(il);
    var s = new Scanner(ol);

    s.next(ink);
    s.return();
    var states = story.states;

    // TODO support alternate seeds
    var seed = 0;
    // I rolled 4d64k this morning, for inkblot.js
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
        render: render,
        dialog: readline,
        randomer: randomer
    });
    readline.engine = engine;
    engine.continue();

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
}

FakeReadline.prototype.question = function question() {
    var answer = this.answers.shift();
    // istanbul ignore if
    if (answer == null) {
        return;
    }
    this.writer.write('> ' + answer + '\n');
    this.engine.answer(answer);
};

FakeReadline.prototype.close = function close() {
};

function StringWriter() {
    this.string = '';
}

StringWriter.prototype.write = function write(string) {
    this.string += string;
};
