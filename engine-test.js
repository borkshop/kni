'use strict';

var fs = require('fs');
var verify = require('./verify');

function main() {
    test('hello.ink', 'tests/hello.1');

    test('examples/archery.ink', 'tests/archery.1');
    test('examples/archery.ink', 'tests/pardon.1');
    test('examples/archery.ink', 'tests/quit.1');
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
    test('tests/conjunctions.ink', 'tests/conjunctions.1');
    test('tests/indirect.ink', 'tests/indirect.1');
    test('tests/literals.ink', 'tests/literals.1');
    test('tests/math.ink', 'tests/math.1');
    test('tests/procedure.ink', 'tests/procedure.1');
    test('tests/program.ink', 'tests/program.1');
    test('tests/random.ink', 'tests/random.1');
    test('tests/rule.ink', 'tests/rule.1');
    test('tests/steady.ink', 'tests/steady.1');
    test('tests/switch-list.ink', 'tests/switch-list.1');
}

function test(inkscript, transcript) {
    var ink = fs.readFileSync(inkscript, 'utf8');
    var trans = fs.readFileSync(transcript, 'utf8');
    var result = verify(ink, trans);

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
