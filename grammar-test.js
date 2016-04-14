'use strict';

var equals = require('pop-equals');
var Scanner = require('./scanner');
var Lexer = require('./lexer');
var LineLexer = require('./line-lexer');
var grammar = require('./grammar');

function test(input, output) {
    var story = {};
    var p = grammar.start();
    var ll = new LineLexer(p);
    var l = new Lexer(ll);
    var s = new Scanner(l);
    for (var i = 0; i < input.length; i++) {
        s.next(input[i]);
    }
    s.return();
    // console.log(JSON.stringify(ll.generator, null, 4));
    if (ll.generator.prev) {
        ll.generator.prev.write(story, 'end');
        story.end = {type: 'end'};
    } else {
        story.start = {type: 'end'};
    }
    // istanbul ignore if
    if (!equals(story, output)) {
        console.error('ERROR');
        console.error(input.join(''));
        console.error('expected');
        console.error(JSON.stringify(output, null, 4));
        console.error('actual');
        console.error(JSON.stringify(story, null, 4));
        global.fail = true;
    }
}

test([
], {
    start: {type: 'end'}
});

test([
    'Hello, World!\n'
], {
    start: {type: 'text', text: 'Hello, World!', next: 'end'},
    end: {type: 'end'}
});

test([
    'Hello, World!\n',
    '\n',
    'Farewell, World!\n'
], {
    "start": {
        "type": "text",
        "text": "Hello, World!",
        "next": "start.1"
    },
    "start.1": {
        "type": "break",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Farewell, World!",
        "next": "end"
    },
    "end": {
        "type": "end"
    }
});

test([
    'Alpha\n',
    '- Bravo\n',
    '\n',
    '  Charlie\n',
    '- Delta\n',
    '\n',
    '  Echo\n',
    '\n',
    'Foxtrot\n'
], {
    "start": {
        "type": "text",
        "text": "Alpha",
        "next": "start.1.1"
    },
    "start.1.1": {
        "type": "option",
        "label": "Bravo",
        "keywords": [],
        "branch": "start.1.1.1",
        "next": "start.1.2"
    },
    "start.1.2": {
        "type": "option",
        "label": "Delta",
        "keywords": [],
        "branch": "start.1.2.1",
        "next": "start.1.3"
    },
    "start.1.1.1": {
        "type": "break",
        "next": "start.1.1.2"
    },
    "start.1.1.2": {
        "type": "text",
        "text": "Charlie",
        "next": "start.2"
    },
    "start.1.2.1": {
        "type": "break",
        "next": "start.1.2.2"
    },
    "start.1.2.2": {
        "type": "text",
        "text": "Echo",
        "next": "start.2"
    },
    "start.1.3": {
        "type": "prompt"
    },
    "start.2": {
        "type": "text",
        "text": "Foxtrot",
        "next": "end"
    },
    "end": {
        "type": "end"
    }
});

