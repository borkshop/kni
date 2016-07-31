'use strict';

var fs = require('fs');
var verify = require('./verify');

function main() {
    test('hello.kni', 'tests/hello.1');

    test('examples/archery.kni', 'tests/archery.1');
    test('examples/archery.kni', 'tests/pardon.1');
    test('examples/ascii.kni', 'tests/ascii.1');
    test('examples/bottles.kni', 'tests/bottles.1');
    test('examples/coin.kni', 'tests/coin.1');
    test('examples/coin.kni', 'tests/coin.2');
    test('examples/distribution.kni', 'tests/distribution.1');
    test('examples/door.kni', 'tests/door.1');
    test('examples/door.kni', 'tests/door.2');
    test('examples/fish.kni', 'tests/fish.1');
    test('examples/fish.kni', 'tests/fish.2');
    test('examples/german.kni', 'tests/german.1');
    test('examples/hilbert.kni', 'tests/hilbert.1');
    test('examples/hilo.kni', 'tests/hilo.1');
    test('examples/liftoff.kni', 'tests/liftoff.1');
    test('examples/list.kni', 'tests/list.1');
    test('examples/option-styles.kni', 'tests/option-styles.1');
    test('examples/paint.kni', 'tests/paint.1');
    test('examples/plane.kni', 'tests/plane.1');
    test('examples/tree.kni', 'tests/tree.1');

    test('tests/brief.kni', 'tests/brief.1');
    test('tests/choices.kni', 'tests/choices.1');
    test('tests/functions.kni', 'tests/functions.1');
    test('tests/gradient.kni', 'tests/gradient.1');
    test('tests/indirect.kni', 'tests/indirect.1');
    test('tests/jump-and-ask.kni', 'tests/jump-and-ask.1');
    test('tests/literals.kni', 'tests/literals.1');
    test('tests/loop.kni', 'tests/loop.1');
    test('tests/math.kni', 'tests/math.1');
    test('tests/no-option.kni', 'tests/no-option.1');
    test('tests/procedure.kni', 'tests/procedure.1');
    test('tests/program.kni', 'tests/program.1');
    test('tests/program.kni', 'tests/program.1');
    test('tests/random.kni', 'tests/random.1');
    test('tests/rule.kni', 'tests/rule.1');
    test('tests/sample.kni', 'tests/sample.1');
    test('tests/steady.kni', 'tests/steady.1');
    test('tests/sub-optional.kni', 'tests/sub-optional.1');
    test('tests/switch-list.kni', 'tests/switch-list.1');

    var asked = false;
    var ended = false;
    test('tests/handler.kni', 'tests/handler.1', {
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

function test(kniscript, transcript, handler) {
    var kni = fs.readFileSync(kniscript, 'utf8');
    var trans = fs.readFileSync(transcript, 'utf8');
    var result = verify(kni, trans, handler);

    // istanbul ignore if
    if (!result.pass) {
        global.fail = true;
        console.log(kniscript, transcript);
        console.log("FAIL");
        console.log("expected");
        console.log(result.expected);
        console.log("got");
        console.log(result.actual);
    }
}

main();
