import fs from 'fs';
import verify from './verify.js';

function main() {
  test('hello.kni', 'tests/hello.1');

  // sorted
  test('examples/archery.kni', 'tests/archery.1');
  test('examples/archery.kni', 'tests/pardon.1');
  test('examples/ascii.kni', 'tests/ascii.1');
  test('examples/bottles.kni', 'tests/bottles.1');
  test('examples/calc.kni', 'tests/calc.1');
  test('examples/coin.kni', 'tests/coin.1');
  test('examples/coin.kni', 'tests/coin.2');
  test('examples/distribution.kni', 'tests/distribution.1');
  test('examples/door-lock.kni', 'tests/door-lock.1');
  test('examples/door.kni', 'tests/door.1');
  test('examples/door.kni', 'tests/door.2');
  test('examples/fish.kni', 'tests/fish.1');
  test('examples/fish.kni', 'tests/fish.2');
  test('examples/german.kni', 'tests/german.1');
  test('examples/hilbert.kni', 'tests/hilbert.1');
  test('examples/hilo.kni', 'tests/hilo.1');
  test('examples/hyperlinks.kni', 'tests/hyperlinks.1');
  test('examples/liftoff.kni', 'tests/liftoff.1');
  test('examples/list.kni', 'tests/list.1');
  test('examples/loop.kni', 'tests/loop.1');
  test('examples/nominal.kni', 'tests/nominal.1');
  test('examples/option-styles.kni', 'tests/option-styles.1');
  test('examples/paint.kni', 'tests/paint.1');
  test('examples/plane.kni', 'tests/plane.1');
  test('examples/read.kni', 'tests/read.1');
  test('examples/subroutine.kni', 'tests/subroutine.1');
  test('examples/subroutine.kni', 'tests/subroutine.2');
  test('examples/tree.kni', 'tests/tree.1');

  // sorted
  test('tests/brief.kni', 'tests/brief.1');
  test('tests/choices.kni', 'tests/choices.1');
  test('tests/cues.kni', 'tests/cues.0'); // Exercises cues without a handler.
  test('tests/flag.kni', 'tests/flag.1');
  test('tests/for-loop.kni', 'tests/for-loop.1');
  test('tests/functions.kni', 'tests/functions.1');
  test('tests/gradient.kni', 'tests/gradient.1');
  test('tests/indirect.kni', 'tests/indirect.1');
  test('tests/jump-and-ask.kni', 'tests/jump-and-ask.1');
  test('tests/keyword-ambiguity.kni', 'tests/keyword-ambiguity.0');
  test('tests/keywords.kni', 'tests/keywords.1');
  test('tests/keywords.kni', 'tests/keywords.2');
  test('tests/keywords.kni', 'tests/keywords.3');
  test('tests/keywords.kni', 'tests/keywords.4');
  test('tests/keywords.kni', 'tests/keywords.5');
  test('tests/literals.kni', 'tests/literals.1');
  test('tests/math.kni', 'tests/math.1');
  test('tests/no-option.kni', 'tests/no-option.1');
  test('tests/number.kni', 'tests/number.1');
  test('tests/procedure.kni', 'tests/procedure.1');
  test('tests/program.kni', 'tests/program.1');
  test('tests/program.kni', 'tests/program.1');
  test('tests/random.kni', 'tests/random.1');
  test('tests/rule.kni', 'tests/rule.1');
  test('tests/sample.kni', 'tests/sample.1');
  test('tests/steady.kni', 'tests/steady.1');
  test('tests/sub-optional.kni', 'tests/sub-optional.1');
  test('tests/switch-list.kni', 'tests/switch-list.1');
  test('tests/toggle.kni', 'tests/toggle.1');

  // sorted
  test('tests/errors/dynamic-goto.kni', 'tests/errors/dynamic-goto.log');
  test('tests/errors/dynamic-label.kni', 'tests/errors/dynamic-label.log');
  test('tests/errors/dynamic-parameter.kni', 'tests/errors/dynamic-parameter.log');
  test(
    'tests/errors/expected-after-brace-paren-expression.kni',
    'tests/errors/expected-after-brace-paren-expression.log'
  );
  test(
    'tests/errors/expected-bracket-to-end-option-after-qa.kni',
    'tests/errors/expected-bracket-to-end-option-after-qa.log'
  );
  test(
    'tests/errors/expected-bracket-to-end-option.kni',
    'tests/errors/expected-bracket-to-end-option.log'
  );
  test(
    'tests/errors/expected-brackets-in-option-but-got-end-of-block.kni',
    'tests/errors/expected-brackets-in-option-but-got-end-of-block.log'
  );
  test('tests/errors/expression-cue.kni', 'tests/errors/expression-cue.log');
  test('tests/errors/invalid-cue.kni', 'tests/errors/invalid-cue.log');
  test(
    'tests/errors/unterminated-brace-indented.kni',
    'tests/errors/unterminated-brace-indented.log'
  );
  test('tests/errors/unterminated-brace.kni', 'tests/errors/unterminated-brace.log');
  test('tests/errors/unterminated-bracket.kni', 'tests/errors/unterminated-bracket.log');

  let asked = false;
  let askedWithCue = false;
  let ended = false;
  test('tests/handler.kni', 'tests/handler.1', {
    moxy: 41,
    has: function has(name) {
      return name === 'moxy';
    },
    get: function get(_name) {
      return this.moxy;
    },
    set: function set(_name, value) {
      this.moxy = value;
    },
    goto: function _goto(_label) {},
    changed: function changed(name, value) {
      process.exitCode |= name !== 'moxy';
      process.exitCode |= value != 42 && value !== 'mox' && value !== 'mux?';
    },
    ask: function ask(engine) {
      if (engine.instruction.cue === 'moxy') {
        askedWithCue = true;
      } else {
        asked = true;
      }
    },
    answer: function answer(text) {
      if (text !== '1' && text !== 'mox' && text !== 'mux?') {
        console.error('Handler test failed with unexpected answer: ', text);
        process.exitCode = 1;
      }
    },
    choice: function _choice(choice) {
      if (choice.keywords[0] !== 'moxy') {
        console.error('Handler test failed to call choice with moxy keyword');
        process.exitCode = 1;
      }
    },
    waypoint: function waypoint(_state) {},
    end: function end(engine) {
      engine.render.paragraph();
      engine.render.write(' ', 'The End.', ' ');
      ended = true;
    },
  });

  if (!ended) {
    console.error('Handle test failed to call end handler');
    process.exitCode = 1;
  }
  if (!asked) {
    console.error('Handle test failed to call ask handler without cue');
    process.exitCode = 1;
  }
  if (!askedWithCue) {
    console.error('Handle test failed to call ask handler with cue');
    process.exitCode = 1;
  }

  let cued;
  test('tests/cues.kni', 'tests/cues.1', {
    cue: function (cue, next, engine) {
      cued = cue;
      return engine.goto(next);
    },
  });
  if (!cued) {
    console.error('Handler test failed to cue');
    process.exitCode = 1;
  }

  test('tests/cues.kni', 'tests/cues.2', {
    cue: function (_cue, next, engine) {
      engine.render.paragraph();
      engine.render.write('', 'Then there was a cue.', '');
      engine.render.paragraph();
      return engine.goto(next);
    },
  });

  if (process.exitCode) {
    console.error('Test failed.');
  }
}

function test(kniscript, transcript, handler) {
  const kni = fs.readFileSync(kniscript, 'utf8');
  const trans = fs.readFileSync(transcript, 'utf8');
  const result = verify(kni, trans, handler, kniscript);

  if (!result.pass) {
    process.exitCode |= 1;
    console.log(kniscript, transcript);
    console.log('FAIL');
    console.log('expected');
    console.log(result.expected);
    console.log('got');
    console.log(result.actual);
  }
}

main();
