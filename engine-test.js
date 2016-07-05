'use strict';

var fs = require('fs');
var xorshift = require('xorshift');
var Engine = require('./engine');
var Console = require('./console');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var Story = require('./story');
var grammar = require('./grammar');

function main() {
    test('examples/archery.ink', 'tests/archery.1');
    test('examples/archery.ink', 'tests/pardon.1');
    test('examples/archery.ink', 'tests/quit.1');
    test('examples/bottles.ink', 'tests/bottles.1');
    test('examples/distribution.ink', 'tests/distribution.1');
    test('examples/fish.ink', 'tests/fish.1');
    test('examples/fish.ink', 'tests/fish.2');
    test('examples/german.ink', 'tests/german.1');
    test('examples/hilbert.ink', 'tests/hilbert.1');
    test('examples/liftoff.ink', 'tests/liftoff.1');
    test('examples/paint.ink', 'tests/paint.1');
    test('examples/plane.ink', 'tests/plane.1');

    test('tests/conjunctions.ink', 'tests/conjunctions.1');
    test('tests/indirect.ink', 'tests/indirect.1');
    test('tests/literals.ink', 'tests/literals.1');
    test('tests/math.ink', 'tests/math.1');
    test('tests/procedure.ink', 'tests/procedure.1');
    test('tests/steady.ink', 'tests/steady.1');
    test('tests/switch-list.ink', 'tests/switch-list.1');
}

function test(inkscript, transcript) {
    var ink = fs.readFileSync(inkscript, 'utf8');
    var trans = fs.readFileSync(transcript, 'utf8');
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

    // istanbul ignore if
    if (writer.string.trim() !== trans.trim()) {
        global.fail = true;
        console.log("FAIL");
        console.log("expected");
        console.log(trans);
        console.log("got");
        console.log(writer.string);
    }
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

main();
