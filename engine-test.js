'use strict';

var fs = require('fs');
var verify = require('./verify');

function main() {
    test('hello.ink', 'tests/hello.1');

    test('examples/archery.ink', 'tests/archery.1');
    test('examples/archery.ink', 'tests/pardon.1');
    test('examples/ascii.ink', 'tests/ascii.1');
    test('examples/bottles.ink', 'tests/bottles.1');
    test('examples/coin.ink', 'tests/coin.1');
    test('examples/coin.ink', 'tests/coin.2');
    test('examples/distribution.ink', 'tests/distribution.1');
    test('examples/door.ink', 'tests/door.1');
    test('examples/door.ink', 'tests/door.2');
    test('examples/fish.ink', 'tests/fish.1');
    test('examples/fish.ink', 'tests/fish.2');
    test('examples/german.ink', 'tests/german.1');
    test('examples/hilbert.ink', 'tests/hilbert.1');
    test('examples/hilo.ink', 'tests/hilo.1');
    test('examples/liftoff.ink', 'tests/liftoff.1');
    test('examples/list.ink', 'tests/list.1');
    test('examples/option-styles.ink', 'tests/option-styles.1');
    test('examples/paint.ink', 'tests/paint.1');
    test('examples/plane.ink', 'tests/plane.1');
    test('examples/tree.ink', 'tests/tree.1');

    test('tests/brief.ink', 'tests/brief.1');
    test('tests/choices.ink', 'tests/choices.1');
    test('tests/functions.ink', 'tests/functions.1');
    test('tests/gradient.ink', 'tests/gradient.1');
    test('tests/indirect.ink', 'tests/indirect.1');
    test('tests/jump-and-ask.ink', 'tests/jump-and-ask.1');
    test('tests/literals.ink', 'tests/literals.1');
    test('tests/loop.ink', 'tests/loop.1');
    test('tests/math.ink', 'tests/math.1');
    test('tests/no-option.ink', 'tests/no-option.1');
    test('tests/procedure.ink', 'tests/procedure.1');
    test('tests/program.ink', 'tests/program.1');
    test('tests/program.ink', 'tests/program.1');
    test('tests/random.ink', 'tests/random.1');
    test('tests/rule.ink', 'tests/rule.1');
    test('tests/sample.ink', 'tests/sample.1');
    test('tests/steady.ink', 'tests/steady.1');
    test('tests/sub-optional.ink', 'tests/sub-optional.1');
    test('tests/switch-list.ink', 'tests/switch-list.1');

    var asked = false;
    var ended = false;
    test('tests/handler.ink', 'tests/handler.1', {
        moxy: 41,
        has: function has(name) {
            return name === 'moxy';
        },
        get: function get(name) {
            return this.moxy;
        },
        set: function set(name, value) {
            this.moxy = value;
        },
        goto: function _goto(label) {
        },
        changed: function changed(name, value) {
            global.fail = global.fail || name !== 'moxy';
            global.fail = global.fail || value !== 42;
        },
        ask: function ask() {
            asked = true;
        },
        answer: function answer(text) {
            global.fail = global.fail || text !== '1';
        },
        waypoint: function waypoint(state) {
        },
        end: function end(engine) {
            engine.render.paragraph();
            engine.render.write(' ', 'The End.', ' ');
            ended = true;
        }
    });

    global.fail = global.fail || !ended;
    global.fail = global.fail || !asked;
}

function test(inkscript, transcript, handler) {
    var ink = fs.readFileSync(inkscript, 'utf8');
    var trans = fs.readFileSync(transcript, 'utf8');
    var result = verify(ink, trans, handler);

    // istanbul ignore if
    if (!result.pass) {
        global.fail = true;
        console.log("FAIL");
        console.log("expected");
        console.log(result.expected);
        console.log("got");
        console.log(result.actual);
    }
}

main();
