import Scanner from './scanner.js';
import OutlineLexer from './outline-lexer.js';
import equals from 'pop-equals';

function test(input, output) {
  const text = input.map(enline).join('');
  const lister = new OutlineLexLister();
  const lexer = new OutlineLexer(lister);
  const scanner = new Scanner(lexer);
  scanner.next(text);
  scanner.return();
  if (!equals(lister.list, output)) {
    console.error('ERROR');
    process.stderr.write(text);
    console.error('expected', output);
    console.error('actual  ', lister.list);
    process.exitCode |= 1;
  }
}

class OutlineLexLister {
  debug = process.env.DEBUG_OUTLINE_LEXER;

  constructor() {
    this.list = [];
  }

  next(type, text, scanner) {
    if (this.debug) {
      console.log('OLL', scanner.position(), type, JSON.stringify(text));
    }
    if (type !== 'text') {
      this.list.push(type.toUpperCase());
    }
    if (text) {
      this.list.push(text);
    }
    return this;
  }
}

function enline(line) {
  return line + '\n';
}

test(['a', 'b'], ['a', 'b', 'STOP']);

test(['a', '  b'], ['a', 'b', 'STOP']);

test(['a', '  b', ' c'], ['a', 'b', 'c', 'STOP']);

test(['a', '  b', '  c'], ['a', 'b', 'c', 'STOP']);

test(['a', '  b', ' ', '  c'], ['a', 'b', 'BREAK', 'c', 'STOP']);

test(['a', '    b', '   \tc'], ['a', 'b', 'c', 'STOP']);

test(['a', '- b', '- c'], ['a', 'START', '-', 'b', 'STOP', 'START', '-', 'c', 'STOP', 'STOP']);

test(
  ['a', '- b', 'c', '- d'],
  ['a', 'START', '-', 'b', 'STOP', 'c', 'START', '-', 'd', 'STOP', 'STOP']
);

test(['a', '- b', '   c'], ['a', 'START', '-', 'b', 'c', 'STOP', 'STOP']);

test(
  ['a', '- b', ' - * c', '     d'],
  ['a', 'START', '-', 'b', 'START', '-*', 'c', 'd', 'STOP', 'STOP', 'STOP']
);

test(['a', '   b', '  c', ' d', 'e'], ['a', 'b', 'c', 'd', 'e', 'STOP']);

test(
  ['Alpha', '+ Bravo', '', '  Charlie', '+ Delta', '', '  Echo', 'Foxtrot'],
  [
    'Alpha',
    'START',
    '+',
    'Bravo',
    'BREAK',
    'Charlie',
    'STOP',
    'START',
    '+',
    'Delta',
    'BREAK',
    'Echo',
    'STOP',
    'Foxtrot',
    'STOP',
  ]
);

test(
  ['+ A', '  + B', '  >', '>', 'B'],
  [
    'START',
    '+',
    'A',
    'START',
    '+',
    'B',
    'STOP',
    'START',
    '>',
    'BREAK',
    'STOP',
    'STOP',
    'START',
    '>',
    'BREAK',
    'STOP',
    'B',
    'STOP',
  ]
);
