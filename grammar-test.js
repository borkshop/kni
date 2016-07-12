'use strict';

var equals = require('pop-equals');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var grammar = require('./grammar');
var Story = require('./story');
var colorize = require('json-diff/lib/colorize').colorize;
var diff = require('json-diff/lib').diff;

Error.stackTraceLimit = Infinity;

function test(input, output) {
    // istanbul ignore if
    if (process.env.ONLY) {
        return;
    }
    only(input, output);
}

function only(input, output) {
    var story = new Story();
    var p = new Parser(grammar.start(story));
    var il = new InlineLexer(p);
    var ol = new OutlineLexer(il);
    var s = new Scanner(ol);
    for (var i = 0; i < input.length; i++) {
        s.next(input[i]);
    }
    s.return();
    // istanbul ignore if
    if (story.errors.length) {
        console.error('ERROR');
        console.error(input.join(''));
        for (var i = 0; i < story.errors.length; i++) {
            console.error(story.errors[i]);
        }
        global.fail = true;
    // istanbul ignore if
    } else if (!equals(story.states, output)) {
        console.error('ERROR');
        console.error(input.join(''));
        console.error('EXPECTED');
        console.error(JSON.stringify(output, null, 4));
        console.error('ACTUAL');
        console.error(JSON.stringify(story.states, null, 4));
        console.error('DIFF');
        console.error(colorize(diff(output, story.states)));
        global.fail = true;
    }
}

test([
], {
    start: {type: 'goto', next: null}
});

test([
    '@end\n'
], {
    start: {type: 'goto', next: "end"},
    end: {type: 'goto', next: null}
});

test([
    '@end\n',
    'The End\n'
], {
    start: {type: 'goto', next: 'end'},
    end: {type: 'text', text: 'The End', lift: ' ', drop: ' ', next: null}
});

test([
    'Hello, World!\n'
], {
    start: {type: 'text', text: 'Hello, World!', lift: '', drop: ' ', next: null}
});

test([
    '  Hello, World!\n'
], {
    start: {type: 'text', text: 'Hello, World!', lift: '', drop: ' ', next: null}
});

test([
    'Hello, World!\n',
    '- Farewell.\n'
], {
    "start": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Farewell.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '- Farewell.\n'
], {
    "start": {
        "type": "text",
        "text": "Farewell.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'Hello, World!\n',
    '\n',
    'Farewell, World!\n'
], {
    "start": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Farewell, World!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'Hello, World!\n',
    '\n',
    '  Farewell, World!\n'
], {
    "start": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Farewell, World!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'One\n',
    '  Two\n',
    '    Three\n',
    '  Four\n',
    'Five\n'
], {
    "start": {
        "type": "text",
        "text": "One Two Three Four Five",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'One\n',
    '  Two\n',
    '    Three\n',
    '    - Four\n',
    '  Five\n',
    'Six\n'
], {
    "start": {
        "type": "text",
        "text": "One Two Three",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Four",
        "lift": "",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Five Six",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '  Hello, World!\n',
    '\n',
    'Farewell, World!\n'
], {
    "start": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Farewell, World!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ Apples\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": null,
        "next": null
    }
});

test([
    '+ Apples\n',
    '+ Oranges\n',
    '>\n',
    'Fruit!\n'
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.3",
        "next": "start.1"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "branch": "start.3",
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
    },
    "start.3": {
        "type": "text",
        "text": "Fruit!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
    '  >\n',
    '>\n',
    'Fruit!\n'
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "branch": "start.2",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "prompt"
    },
    "start.1": {
        "type": "prompt"
    },
    "start.2": {
        "type": "text",
        "text": "Fruit!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
    '  >\n',
    '+ Oranges\n',
    '>\n',
    'Fruit!\n'
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "branch": "start.3",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "prompt"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "branch": "start.3",
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
    },
    "start.3": {
        "type": "text",
        "text": "Fruit!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
    '+ Oranges\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "branch": null,
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "branch": null,
        "next": null
    }
});

test([
    'Alpha\n',
    '+ Bravo\n',
    '\n',
    '  Charlie\n',
    '+ Delta\n',
    '\n',
    '  Echo\n',
    '\n',
    'Foxtrot\n'
], {
    "start": {
        "type": "text",
        "text": "Alpha",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "option",
        "label": "Bravo",
        "branch": "start.1.1",
        "next": "start.2"
    },
    "start.1.1": {
        "type": "text",
        "text": "Charlie",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "start.2": {
        "type": "option",
        "label": "Delta",
        "branch": "start.2.1",
        "next": "start.3"
    },
    "start.2.1": {
        "type": "text",
        "text": "Echo",
        "lift": "",
        "drop": " ",
        "next": null,
    },
    "start.3": {
        "type": "text",
        "text": "Foxtrot",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'Alpha\n',
    '+ Bravo\n',
    '\n',
    '  Charlie\n',
    '+ Delta\n',
    '\n',
    '  Echo\n',
    '\n',
    '>\n',
    'Foxtrot\n'
], {
    "start": {
        "type": "text",
        "text": "Alpha",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "option",
        "label": "Bravo",
        "branch": "start.1.1",
        "next": "start.2"
    },
    "start.1.1": {
        "type": "text",
        "text": "Charlie",
        "lift": "",
        "drop": " ",
        "next": "start.4"
    },
    "start.2": {
        "type": "option",
        "label": "Delta",
        "branch": "start.2.1",
        "next": "start.3"
    },
    "start.2.1": {
        "type": "text",
        "text": "Echo",
        "lift": "",
        "drop": " ",
        "next": "start.4",
    },
    "start.3": {
        "type": "prompt"
    },
    "start.4": {
        "type": "text",
        "text": "Foxtrot",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'Alpha\n',
    '+ Bravo\n',
    '+ Charlie\n',
    'Delta\n'
], {
    "start": {
        "type": "text",
        "text": "Alpha",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "option",
        "label": "Bravo",
        "branch": null,
        "next": "start.2"
    },
    "start.2": {
        "type": "option",
        "label": "Charlie",
        "branch": null,
        "next": "start.3"
    },
    "start.3": {
        "type": "text",
        "text": "Delta",
        "lift": "",
        "drop": " ",
        "next": null
    }
});


test([
    'Alpha\n',
    '+ Bravo\n',
    '+ Charlie\n',
    '>\n',
    'Delta\n'
], {
    "start": {
        "type": "text",
        "text": "Alpha",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "option",
        "label": "Bravo",
        "branch": "start.4",
        "next": "start.2"
    },
    "start.2": {
        "type": "option",
        "label": "Charlie",
        "branch": "start.4",
        "next": "start.3"
    },
    "start.3": {
        "type": "prompt"
    },
    "start.4": {
        "type": "text",
        "text": "Delta",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
    '  + Braeburns\n',
    '+ Oranges\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "branch": null,
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "option",
        "label": "Braeburns",
        "branch": null,
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "branch": null,
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
    '    + Braeburns\n',
    '    + Galas\n',
    '  + Fujis\n',
    '+ Oranges\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "branch": "start.0.1.1",
        "next": "start.0.2"
    },
    "start.0.1.1": {
        "type": "option",
        "label": "Braeburns",
        "branch": null,
        "next": "start.0.1.2"
    },
    "start.0.1.2": {
        "type": "option",
        "label": "Galas",
        "branch": null,
        "next": null
    },
    "start.0.2": {
        "type": "option",
        "label": "Fujis",
        "branch": null,
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "branch": null,
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
    '    + Braeburns\n',
    '    + Galas\n',
    '    >\n',
    '  + Fujis\n',
    '+ Oranges\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "branch": "start.0.1.1",
        "next": "start.0.2"
    },
    "start.0.1.1": {
        "type": "option",
        "label": "Braeburns",
        "branch": null,
        "next": "start.0.1.2"
    },
    "start.0.1.2": {
        "type": "option",
        "label": "Galas",
        "branch": null,
        "next": "start.0.1.3"
    },
    "start.0.1.3": {
        "type": "prompt"
    },
    "start.0.2": {
        "type": "option",
        "label": "Fujis",
        "branch": null,
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "branch": null,
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
    '    + Braeburns\n',
    '    + Galas\n',
    '    >\n',
    '  + Fujis\n',
    '+ Oranges\n',
    '>\n',
    'Fruit!\n'
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "branch": "start.0.1.1",
        "next": "start.0.2"
    },
    "start.0.1.1": {
        "type": "option",
        "label": "Braeburns",
        "branch": "start.3",
        "next": "start.0.1.2"
    },
    "start.0.1.2": {
        "type": "option",
        "label": "Galas",
        "branch": "start.3",
        "next": "start.0.1.3"
    },
    "start.0.1.3": {
        "type": "prompt"
    },
    "start.0.2": {
        "type": "option",
        "label": "Fujis",
        "branch": "start.3",
        "next": "start.3"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "branch": "start.3",
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
    },
    "start.3": {
        "type": "text",
        "text": "Fruit!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
    '    + Braeburns\n',
    '    + Galas\n',
    '    >\n',
    '  + Fujis\n',
    '  >\n',
    '+ Oranges\n',
    '>\n',
    'Fruit!\n'
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "branch": "start.0.1.1",
        "next": "start.0.2"
    },
    "start.0.1.1": {
        "type": "option",
        "label": "Braeburns",
        "branch": "start.3",
        "next": "start.0.1.2"
    },
    "start.0.1.2": {
        "type": "option",
        "label": "Galas",
        "branch": "start.3",
        "next": "start.0.1.3"
    },
    "start.0.1.3": {
        "type": "prompt"
    },
    "start.0.2": {
        "type": "option",
        "label": "Fujis",
        "branch": "start.3",
        "next": "start.0.3"
    },
    "start.0.3": {
        "type": "prompt"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "branch": "start.3",
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
    },
    "start.3": {
        "type": "text",
        "text": "Fruit!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '@hi\n',
    'Hello, World!\n',
], {
    "start": {
        "type": "goto",
        "next": "hi"
    },
    "hi": {
        "type": "text",
        "text": "Hello, World!",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    '@hi Hello, World!\n',
], {
    "start": {
        "type": "goto",
        "next": "hi"
    },
    "hi": {
        "type": "text",
        "text": "Hello, World!",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    'Hello, World!\n',
    '->start\n'
], {
    "start": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
        "drop": " ",
        "next": "start"
    }
});

test([
    'Hello, World!\n',
    '->\n',
    'start\n'
], {
    "start": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
        "drop": " ",
        "next": "start"
    }
});

test([
    'Hello, World!\n',
    '-> \n',
    'start\n'
], {
    "start": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
        "drop": " ",
        "next": "start"
    }
});

test([
    '->hi\n',
    '@hi\n'
], {
    "start": {
        "type": "goto",
        "next": "hi"
    },
    "hi": {
        "type": "goto",
        "next": null
    }
});

test([
    '->hi\n',
    '@hi\n',
    'Hello, World!\n',
    '->hi\n'
], {
    "start": {
        "type": "goto",
        "next": "hi"
    },
    "hi": {
        "type": "text",
        "text": "Hello, World!",
        "lift": " ",
        "drop": " ",
        "next": "hi"
    }
});

test([
    '+ You s[S]ay, "Hello, World!"\n'
], {
    "start": {
        "type": "option",
        "label": "Say, \"Hello, World!\"",
        "branch": "start.0.1",
        "next": null
    },
    "start.0.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "text",
        "text": "ay, \"Hello, World!\"",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ You s[S]ay, "Hello, World!"\n',
    '>\n'
], {
    "start": {
        "type": "option",
        "label": "Say, \"Hello, World!\"",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "text",
        "text": "ay, \"Hello, World!\"",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "start.1": {
        "type": "prompt"
    }
});

test([
    '+ You s[S]ay, "Hello, World!" /\n',
    '  They reply, "Good bye!"\n'
], {
    "start": {
        "type": "option",
        "label": "Say, \"Hello, World!\"",
        "branch": "start.0.1",
        "next": null
    },
    "start.0.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "text",
        "text": "ay, \"Hello, World!\"",
        "lift": "",
        "drop": " ",
        "next": "start.0.3"
    },
    "start.0.3": {
        "type": "text",
        "text": "They reply, \"Good bye!\"",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    '+ You s[S]ay, "Hello, World!"\n',
    '+ You s[S]ay, "Good bye."\n'
], {
    "start": {
        "type": "option",
        "label": "Say, \"Hello, World!\"",
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "start.0.2",
    },
    "start.0.2": {
        "type": "text",
        "text": "ay, \"Hello, World!\"",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Say, \"Good bye.\"",
        "branch": "start.1.1",
        "next": null
    },
    "start.1.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "start.1.2"
    },
    "start.1.2": {
        "type": "text",
        "text": "ay, \"Good bye.\"",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ "Hello, World]!"[," you reply.\n'
], {
    "start": {
        "type": "option",
        "label": "\"Hello, World!\"",
        "branch": "start.0.1",
        "next": null
    },
    "start.0.1": {
        "type": "text",
        "text": "\"Hello, World",
        "lift": "",
        "drop": "",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "text",
        "text": ",\" you reply.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ Alpha\n',
    '\n',
    '+ Omega\n'
], {
    "start": {
        "type": "option",
        "label": "Alpha",
        "next": "start.1",
        "branch": null,
    },
    "start.1": {
        "type": "option",
        "label": "Omega",
        "next": null,
        "branch": null,
    }
});

test([
    '+ Alpha\n',
    '>\n',
    '+ Omega\n'
], {
    "start": {
        "type": "option",
        "label": "Alpha",
        "next": "start.1",
        "branch": "start.2",
    },
    "start.1": {
        "type": "prompt"
    },
    "start.2": {
        "type": "option",
        "label": "Omega",
        "next": null,
        "branch": null,
    }
});

test([
    '+ Alpha\n',
    '  - Omega\n'
], {
    "start": {
        "type": "option",
        "label": "Alpha",
        "next": null,
        "branch": "start.0.1",
    },
    "start.0.1": {
        "type": "text",
        "text": "Omega",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '+ [Alpha]\n',
    '  Omega\n'
], {
    "start": {
        "type": "option",
        "label": "Alpha Omega",
        "branch": "start.0.1",
        "next": null
    },
    "start.0.1": {
        "type": "text",
        "text": "Omega",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    '+ [Alpha]\n',
], {
    "start": {
        "type": "option",
        "label": "Alpha",
        "branch": null,
        "next": null
    }
});

test([
    '* [Choice]\n',
    'Fin\n'
], {
    "start": {
        "type": "jump",
        "condition": ["!=", ["get", "start"], ["val", 0]],
        "branch": "start.1",
        "next": "start.0.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Choice",
        "next": "start.1",
        "branch": "start.0.2",
    },
    "start.0.2": {
        "type": "set",
        "variable": "start",
        "expression": ["+", ["get", "start"], ["val", 1]],
        "next": null
    },
    "start.1": {
        "type": "text",
        "text": "Fin",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '* [Choice]\n',
    '>\n',
    'Fin\n'
], {
    "start": {
        "type": "jump",
        "condition": ["!=", ["get", "start"], ["val", 0]],
        "branch": "start.1",
        "next": "start.0.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Choice",
        "next": "start.1",
        "branch": "start.0.2",
    },
    "start.0.2": {
        "type": "set",
        "variable": "start",
        "expression": ["+", ["get", "start"], ["val", 1]],
        "next": "start.2"
    },
    "start.1": {
        "type": "prompt"
    },
    "start.2": {
        "type": "text",
        "text": "Fin",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '* [One Fish]\n',
    '* [Two Fish]\n',
    'Fin\n'
], {
    "start": {
        "type": "jump",
        "condition": ["!=", ["get", "start"], ["val", 0]],
        "branch": "start.1",
        "next": "start.0.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "One Fish",
        "next": "start.1",
        "branch": "start.0.2",
    },
    "start.0.2": {
        "type": "set",
        "variable": "start",
        "expression": ["+", ["get", "start"], ["val", 1]],
        "next": null
    },
    "start.1": {
        "type": "jump",
        "condition": ["!=", ["get", "start.1"], ["val", 0]],
        "branch": "start.2",
        "next": "start.1.1"
    },
    "start.1.1": {
        "type": "option",
        "label": "Two Fish",
        "next": "start.2",
        "branch": "start.1.2",
    },
    "start.1.2": {
        "type": "set",
        "variable": "start.1",
        "expression": ["+", ["get", "start.1"], ["val", 1]],
        "next": null
    },
    "start.2": {
        "type": "text",
        "text": "Fin",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '* [One Fish]\n',
    '* [Two Fish]\n',
    '>\n',
    'Fin\n'
], {
    "start": {
        "type": "jump",
        "condition": ["!=", ["get", "start"], ["val", 0]],
        "branch": "start.1",
        "next": "start.0.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "One Fish",
        "next": "start.1",
        "branch": "start.0.2",
    },
    "start.0.2": {
        "type": "set",
        "variable": "start",
        "expression": ["+", ["get", "start"], ["val", 1]],
        "next": "start.3"
    },
    "start.1": {
        "type": "jump",
        "condition": ["!=", ["get", "start.1"], ["val", 0]],
        "branch": "start.2",
        "next": "start.1.1"
    },
    "start.1.1": {
        "type": "option",
        "label": "Two Fish",
        "next": "start.2",
        "branch": "start.1.2",
    },
    "start.1.2": {
        "type": "set",
        "variable": "start.1",
        "expression": ["+", ["get", "start.1"], ["val", 1]],
        "next": "start.3"
    },
    "start.2": {
        "type": "prompt"
    },
    "start.3": {
        "type": "text",
        "text": "Fin",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '{}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "start"],
        "branches": ["start.0.1"],
        "mode": "walk",
        "value": 1
    },
    "start.0.1": {
        "type": "goto",
        "next": null
    }
});

test([
    '{|}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "start"],
        "branches": ["start.0.1", "start.0.2"],
        "value": 1,
        "mode": "walk"
    },
    "start.0.1": {
        "type": "goto",
        "next": null
    },
    "start.0.2": {
        "type": "goto",
        "next": null
    }
});

test([
    '{Alpha|Beta|Gamma}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "start"],
        "branches": ["start.0.1", "start.0.2", "start.0.3"],
        "mode": "walk",
        "value": 1
    },
    "start.0.1": {
        "type": "text",
        "text": "Alpha",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.0.2": {
        "type": "text",
        "text": "Beta",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.0.3": {
        "type": "text",
        "text": "Gamma",
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    '{Alpha|Bravo|Charlie}, Over\n'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "start"],
        "branches": ["start.0.1", "start.0.2", "start.0.3"],
        "value": 1,
        "mode": "walk"
    },
    "start.0.1": {
        "type": "text",
        "text": "Alpha",
        "lift": "",
        "drop": "",
        "next": "start.1"
    },
    "start.0.2": {
        "type": "text",
        "text": "Bravo",
        "lift": "",
        "drop": "",
        "next": "start.1"
    },
    "start.0.3": {
        "type": "text",
        "text": "Charlie",
        "lift": "",
        "drop": "",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": ", Over",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'Counting down, {Three|Two|One}, Lift-off\n'
], {
    "start": {
        "type": "text",
        "text": "Counting down,",
        "lift": "",
        "drop": " ",
        "next": "start.1",
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "start.1"],
        "branches": ["start.1.1", "start.1.2", "start.1.3"],
        "value": 1,
        "mode": "walk"
    },
    "start.1.1": {
        "type": "text",
        "text": "Three",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.1.2": {
        "type": "text",
        "text": "Two",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.1.3": {
        "type": "text",
        "text": "One",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": ", Lift-off",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'Counting down, {3|2|1}, Lift-off\n'
], {
    "start": {
        "type": "text",
        "text": "Counting down,",
        "lift": "",
        "drop": " ",
        "next": "start.1",
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "start.1"],
        "branches": ["start.1.1", "start.1.2", "start.1.3"],
        "value": 1,
        "mode": "walk"
    },
    "start.1.1": {
        "type": "text",
        "text": "3",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.1.2": {
        "type": "text",
        "text": "2",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.1.3": {
        "type": "text",
        "text": "1",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": ", Lift-off",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'Counting down, {Three||One}, Lift-off\n'
], {
    "start": {
        "type": "text",
        "text": "Counting down,",
        "lift": "",
        "drop": " ",
        "next": "start.1",
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "start.1"],
        "branches": ["start.1.1", "start.1.2", "start.1.3"],
        "value": 1,
        "mode": "walk"
    },
    "start.1.1": {
        "type": "text",
        "text": "Three",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.1.2": {
        "type": "goto",
        "next": "start.2"
    },
    "start.1.3": {
        "type": "text",
        "text": "One",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": ", Lift-off",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '{Win! -> win}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "start"],
        "branches": ["start.0.1"],
        "value": 1,
        "mode": "walk"
    },
    "start.0.1": {
        "type": "text",
        "text": "Win!",
        "lift": "",
        "drop": " ",
        "next": "win"
    }
});

test([
    '{Win!-> win}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "start"],
        "branches": ["start.0.1"],
        "value": 1,
        "mode": "walk"
    },
    "start.0.1": {
        "type": "text",
        "text": "Win!",
        "lift": "",
        "drop": "",
        "next": "win"
    }
});

test([
    '{=1 hi}'
], {
    "start": {
        "type": "set",
        "variable": "hi",
        "expression": ["val", 1],
        "next": null
    }
});

test([
    '{=1 hi} Hello'
], {
    "start": {
        "type": "set",
        "variable": "hi",
        "expression": ["val", 1],
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Hello",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    '{?hi} Hello'
], {
    "start": {
        "type": "jump",
        "condition": ["!=", ["get", "hi"], ["val", 0]],
        "branch": "start.1",
        "next": null
    },
    "start.1": {
        "type": "text",
        "text": "Hello",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    '{!hi} Hello'
], {
    "start": {
        "type": "jump",
        "condition": ["==", ["get", "hi"], ["val", 0]],
        "branch": "start.1",
        "next": null
    },
    "start.1": {
        "type": "text",
        "text": "Hello",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    '- {!hi} Hello\n',
    'Bye\n',
], {
    "start": {
        "type": "jump",
        "condition": ["==", ["get", "hi"], ["val", 0]],
        "branch": "start.1",
        "next": "start.2"
    },
    "start.1": {
        "type": "text",
        "text": "Hello",
        "lift": " ",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Bye",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '{-10 gil} {+1 arrow}'
], {
    "start": {
        "type": "set",
        "variable": "gil",
        "expression": ["-", ["get", "gil"], ["val", 10]],
        "next": "start.1"
    },
    "start.1": {
        "type": "set",
        "variable": "arrow",
        "expression": ["+", ["get", "arrow"], ["val", 1]],
        "next": null
    }
});

test([
    '{-10 gil} {+arrow}'
], {
    "start": {
        "type": "set",
        "variable": "gil",
        "expression": ["-", ["get", "gil"], ["val", 10]],
        "next": "start.1"
    },
    "start.1": {
        "type": "set",
        "variable": "arrow",
        "expression": ["+", ["get", "arrow"], ["val", 1]],
        "next": null
    }
});

test([
    '{{a|b}}'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "start"],
        "value": 1,
        "mode": "walk",
        "branches": [
            "start.0.1"
        ]
    },
    "start.0.1": {
        "type": "switch",
        "expression": ["get", "start.0.1"],
        "value": 1,
        "mode": "walk",
        "branches": [
            "start.0.1.0.1",
            "start.0.1.0.2"
        ]
    },
    "start.0.1.0.1": {
        "type": "text",
        "text": "a",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.0.1.0.2": {
        "type": "text",
        "text": "b",
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    '{\n',
    '- hi\n',
    '}\n',
], {
    "start": {
        "type": "switch",
        "expression": ["get", "start"],
        "value": 1,
        "mode": "walk",
        "branches": [
            "start.0.1"
        ]
    },
    "start.0.1": {
        "type": "text",
        "text": "hi",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    "@top\n",
    "Text\n",
    "@bottom\n"
], {
    "start": {
        "type": "goto",
        "next": "top"
    },
    "top": {
        "type": "text",
        "text": "Text",
        "lift": " ",
        "drop": " ",
        "next": "bottom"
    },
    "bottom": {
        "type": "goto",
        "next": null
    }
});

test([
    '# no comment\n'
], {
    start: {type: 'goto', next: null}
});

test([
    'Comment # no comment\n'
], {
    start: {type: 'text', text: 'Comment', lift: '', drop: ' ', next: null}
});

test([
    '{$start.1}\n'
], {
    "start": {
        "type": "print",
        "expression": ["get", "start.1"],
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    '{$arrow|no arrows|an arrow|{$arrow} arrows}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "arrow"],
        "branches": [
            "start.0.1",
            "start.0.2",
            "start.0.3"
        ],
        "value": 0,
        "mode": "walk"
    },
    "start.0.1": {
        "type": "text",
        "text": "no arrows",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.0.2": {
        "type": "text",
        "text": "an arrow",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.0.3": {
        "type": "print",
        "expression": ["get", "arrow"],
        "lift": "",
        "drop": "",
        "next": "start.0.3.1"
    },
    "start.0.3.1": {
        "type": "text",
        "text": "arrows",
        "lift": " ",
        "drop": "",
        "next": null
    }
});

test([
    '{$arrow|{$arrow} arrows|some arrows}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["get", "arrow"],
        "branches": [
            "start.0.1",
            "start.0.2"
        ],
        "value": 0,
        "mode": "walk"
    },
    "start.0.1": {
        "type": "print",
        "expression": ["get", "arrow"],
        "lift": "",
        "drop": "",
        "next": "start.0.1.1"
    },
    "start.0.1.1": {
        "type": "text",
        "text": "arrows",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "start.0.2": {
        "type": "text",
        "text": "some arrows",
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    'You see {$door|an open|a closed} door.\n'
], {
    "start": {
        "type": "text",
        "text": "You see",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "door"],
        "branches": [
            "start.1.1",
            "start.1.2"
        ],
        "value": 0,
        "mode": "walk"
    },
    "start.1.1": {
        "type": "text",
        "text": "an open",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.1.2": {
        "type": "text",
        "text": "a closed",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "door.",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    'You see {$door|an open|a closed} door.\n',
    'The knob is wrought of {$knob|brass|iron}.\n'
], {
    "start": {
        "type": "text",
        "text": "You see",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "door"],
        "branches": [
            "start.1.1",
            "start.1.2"
        ],
        "value": 0,
        "mode": "walk"
    },
    "start.1.1": {
        "type": "text",
        "text": "an open",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.1.2": {
        "type": "text",
        "text": "a closed",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "door. The knob is wrought of",
        "lift": " ",
        "drop": " ",
        "next": "start.3"
    },
    "start.3": {
        "type": "switch",
        "expression": ["get", "knob"],
        "branches": [
            "start.3.1",
            "start.3.2"
        ],
        "value": 0,
        "mode": "walk"
    },
    "start.3.1": {
        "type": "text",
        "text": "brass",
        "lift": "",
        "drop": "",
        "next": "start.4"
    },
    "start.3.2": {
        "type": "text",
        "text": "iron",
        "lift": "",
        "drop": "",
        "next": "start.4"
    },
    "start.4": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'You have {$gold|no gold|{$gold} gold}.\n'
], {
    "start": {
        "type": "text",
        "text": "You have",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "gold"],
        "branches": [
            "start.1.1",
            "start.1.2"
        ],
        "value": 0,
        "mode": "walk"
    },
    "start.1.1": {
        "type": "text",
        "text": "no gold",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.1.2": {
        "type": "print",
        "expression": ["get", "gold"],
        "lift": "",
        "drop": "",
        "next": "start.1.2.1"
    },
    "start.1.2.1": {
        "type": "text",
        "text": "gold",
        "lift": " ",
        "drop": "",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '- {!=0 gold} You are rich!\n',
    'Get on with it.\n'
], {
    "start": {
        "type": "jump",
        "condition": ["!=", ["get", "gold"], ["val", 0]],
        "next": "start.2",
        "branch": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "You are rich!",
        "lift": " ",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Get on with it.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '- {==0 gold} You are poor!\n',
    'Get on with it.\n'
], {
    "start": {
        "type": "jump",
        "condition": ["==", ["get", "gold"], ["val", 0]],
        "next": "start.2",
        "branch": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "You are poor!",
        "lift": " ",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Get on with it.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '- {>=10 gold} You are rich!\n',
    'Get on with it.\n'
], {
    "start": {
        "type": "jump",
        "condition": [">=", ["get", "gold"], ["val", 10]],
        "next": "start.2",
        "branch": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "You are rich!",
        "lift": " ",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Get on with it.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '- {<=10 gold} You are poor!\n',
    'Get on with it.\n'
], {
    "start": {
        "type": "jump",
        "condition": ["<=", ["get", "gold"], ["val", 10]],
        "next": "start.2",
        "branch": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "You are poor!",
        "lift": " ",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Get on with it.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '- {>10 gold} You are rich!\n',
    'Get on with it.\n'
], {
    "start": {
        "type": "jump",
        "condition": [">", ["get", "gold"], ["val", 10]],
        "next": "start.2",
        "branch": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "You are rich!",
        "lift": " ",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Get on with it.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '- {<10 gold} You are poor!\n',
    'Get on with it.\n'
], {
    "start": {
        "type": "jump",
        "condition": ["<", ["get", "gold"], ["val", 10]],
        "next": "start.2",
        "branch": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "You are poor!",
        "lift": " ",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Get on with it.",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    'Roses are red / Violets are blue'
], {
    "start": {
        "type": "text",
        "text": "Roses are red",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "break",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Violets are blue",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    'And they lived happily ever after.\n',
    '----\n',
    'The end.\n'
], {
    "start": {
        "type": "text",
        "text": "And they lived happily ever after.",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "paragraph",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "The end.",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    'My favorite color is blue{~.|, no yellow!}'
], {
    "start": {
        "type": "text",
        "text": "My favorite color is blue",
        "lift": "",
        "drop": "",
        "next": "start.1"
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "start.1"],
        "value": 0,
        "mode": "rand",
        "branches": [
            "start.1.1",
            "start.1.2"
        ]
    },
    "start.1.1": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.1.2": {
        "type": "text",
        "text": ", no yellow!",
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    'My favorite color is blue{%.|, no yellow!}'
], {
    "start": {
        "type": "text",
        "text": "My favorite color is blue",
        "lift": "",
        "drop": "",
        "next": "start.1"
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "start.1"],
        "value": 1,
        "mode": "loop",
        "branches": [
            "start.1.1",
            "start.1.2"
        ]
    },
    "start.1.1": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.1.2": {
        "type": "text",
        "text": ", no yellow!",
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    'My favorite color is blue{@color|.|, no yellow!}'
], {
    "start": {
        "type": "text",
        "text": "My favorite color is blue",
        "lift": "",
        "drop": "",
        "next": "start.1"
    },
    "start.1": {
        "type": "switch",
        "expression": ["get", "color"],
        "value": 0,
        "mode": "loop",
        "branches": [
            "start.1.1",
            "start.1.2"
        ]
    },
    "start.1.1": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.1.2": {
        "type": "text",
        "text": ", no yellow!",
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    'Good bye. <-\n',
    'Stranded text.'
], {
    "start": {
        "type": "text",
        "text": "Good bye.",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "start.1": {
        "type": "text",
        "text": "Stranded text.",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    '@hello() Hello.',
], {
    "start": {
        "type": "goto",
        "next": null
    },
    "hello": {
        "type": "subroutine",
        "locals": [],
        "next": "hello.1"
    },
    "hello.1": {
        "type": "text",
        "text": "Hello.",
        "lift": " ",
        "drop": " ",
        "next": null
    }
});

test([
    '- @hello(name) Hello, {$name}.\n',
    'Good bye'
], {
    "start": {
        "type": "goto",
        "next": "start.1"
    },
    "hello": {
        "type": "subroutine",
        "locals": [
            "name"
        ],
        "next": "hello.1"
    },
    "hello.1": {
        "type": "text",
        "text": "Hello,",
        "lift": " ",
        "drop": " ",
        "next": "hello.2"
    },
    "hello.2": {
        "type": "print",
        "expression": ["get", "name"],
        "lift": "",
        "drop": "",
        "next": "hello.3"
    },
    "hello.3": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "start.1": {
        "type": "text",
        "text": "Good bye",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '{->hello {=10 world}}'
], {
    "start": {
        "type": "call",
        "label": "hello",
        "branch": "start.0.1",
        "next": null
    },
    "start.0.1": {
        "type": "set",
        "variable": "world",
        "expression": ["val", 10],
        "next": "hello"
    }
});

test([
    '{=(n)m}'
], {
    "start": {
        "type": "set",
        "variable": "m",
        "expression": ["get", "n"],
        "next": null
    }
});

test([
    '{=(10)m}'
], {
    "start": {
        "type": "set",
        "variable": "m",
        "expression": ["val", 10],
        "next": null
    }
});

test([
    '{=(n+10)m}'
], {
    "start": {
        "type": "set",
        "variable": "m",
        "expression": ["+", ["get", "n"], ["val", 10]],
        "next": null
    }
});

test([
    '{=(a+b-c)m}'
], {
    "start": {
        "type": "set",
        "variable": "m",
        "expression": ["-",
            ["+", ["get", "a"], ["get", "b"]],
            ["get", "c"]
        ],
        "next": null
    }
});

test([
    '{=(a+(b-c))m}'
], {
    "start": {
        "type": "set",
        "variable": "m",
        "expression": ["+",
            ["get", "a"],
            ["-", ["get", "b"], ["get", "c"]]
        ],
        "next": null
    }
});

test([
    '{=(a*b+c)m}'
], {
    "start": {
        "type": "set",
        "variable": "m",
        "expression": ["+",
            ["*", ["get", "a"], ["get", "b"]],
            ["get", "c"]
        ],
        "next": null
    }
});

test([
    '{=(a+b*c)m}'
], {
    "start": {
        "type": "set",
        "variable": "m",
        "expression": ["+",
            ["get", "a"],
            ["*", ["get", "b"], ["get", "c"]]
        ],
        "next": null
    }
});

test([
    '{$a + b}\n'
], {
    "start": {
        "type": "print",
        "expression": ["+", ["get", "a"], ["get", "b"]],
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    '{?x|true|false}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["==", ["get", "x"], [ "val", 0]],
        "value": 0,
        "mode": "walk",
        "branches": [
            "start.0.1",
            "start.0.2"
        ]
    },
    "start.0.1": {
        "type": "text",
        "text": "true",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.0.2": {
        "type": "text",
        "text": "false",
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    '{!x|true|false}\n'
], {
    "start": {
        "type": "switch",
        "expression": ["!=", ["get", "x"], [ "val", 0]],
        "value": 0,
        "mode": "walk",
        "branches": [
            "start.0.1",
            "start.0.2"
        ]
    },
    "start.0.1": {
        "type": "text",
        "text": "true",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.0.2": {
        "type": "text",
        "text": "false",
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    '{<10x|true}\n'
], {
    "start": {
        "type": "switch",
        "expression": [">=", ["get", "x"], ["val", 10]],
        "value": 0,
        "mode": "walk",
        "branches": [
            "start.0.1",
            "start.0.2"
        ]
    },
    "start.0.1": {
        "type": "text",
        "text": "true",
        "lift": "",
        "drop": "",
        "next": null
    },
    "start.0.2": {
        "type": "goto",
        "next": null
    }
});

test([
    '{<10x|true}regardless\n'
], {
    "start": {
        "type": "switch",
        "expression": [">=", ["get", "x"], ["val", 10]],
        "value": 0,
        "mode": "walk",
        "branches": [
            "start.0.1",
            "start.0.2",
        ]
    },
    "start.0.1": {
        "type": "text",
        "text": "true",
        "lift": "",
        "drop": "",
        "next": "start.1"
    },
    "start.0.2": {
        "type": "goto",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "regardless",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '{$x < 10}\n'
], {
    "start": {
        "type": "print",
        "expression": ["<", ["get", "x"], ["val", 10]],
        "lift": "",
        "drop": "",
        "next": null
    },
});

test([
    '{$1 and 0}\n'
], {
    "start": {
        "type": "print",
        "expression": [
            "and",
            ["val", 1],
            ["val", 0]
        ],
        "lift": "",
        "drop": "",
        "next": null
    },
});

test([
    '{$1 and 2 or 3}\n'
], {
    "start": {
        "type": "print",
        "expression": [
            "or",
            ["and", ["val", 1], ["val", 2]],
            ["val", 3]
        ],
        "lift": "",
        "drop": "",
        "next": null
    },
});

test([
    '{$x < 10 and y > 20}\n'
], {
    "start": {
        "type": "print",
        "expression": [
            "and",
            ["<", ["get", "x"], ["val", 10]],
            [">", ["get", "y"], ["val", 20]]
        ],
        "lift": "",
        "drop": "",
        "next": null
    },
});

test([
    '{$2~6 + 1}\n'
], {
    "start": {
        "type": "print",
        "expression": ["+", ["~", ["val", 2], ["val", 6]], ["val", 1]],
        "lift": "",
        "drop": "",
        "next": null
    }
});

test([
    '{, }\n'
], {
    start: {
        type: 'delimit',
        delimiter: ',',
        next: null
    }
});

// TODO stop conjunction with alt if no delimits
test([
    '{, and |x{,} y{,} z{,}}.\n'
], {
    "start": {
        "type": "startJoin",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "x",
        "lift": "",
        "drop": "",
        "next": "start.2"
    },
    "start.2": {
        "type": "delimit",
        "delimiter": ",",
        "next": "start.3"
    },
    "start.3": {
        "type": "text",
        "text": "y",
        "lift": " ",
        "drop": "",
        "next": "start.4"
    },
    "start.4": {
        "type": "delimit",
        "delimiter": ",",
        "next": "start.5"
    },
    "start.5": {
        "type": "text",
        "text": "z",
        "lift": " ",
        "drop": "",
        "next": "start.6"
    },
    "start.6": {
        "type": "delimit",
        "delimiter": ",",
        "next": "start.7"
    },
    "start.7": {
        "type": "stopJoin",
        "next": "start.8"
    },
    "start.8": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '{=source.{x}.{y} target.{w}.{z}}\n'
], {
    "start": {
        "type": "mov",
        "target": ["var", ["target.", ".", ""], [["get", "w"], ["get", "z"]]],
        "source": ["var", ["source.", ".", ""], [["get", "x"], ["get", "y"]]],
        "next": null
    }
});

test([
    '{+1 {x}.{y}}\n'
], {
    "start": {
        "type": "mov",
        "target": ["var", ["", ".", ""], [["get", "x"], ["get", "y"]]],
        "source": ["+", ["var", ["", ".", ""], [["get", "x"], ["get", "y"]]], ["val", 1]],
        "next": null
    }
});

test([
    '{+{x}.{y}}\n'
], {
    "start": {
        "type": "mov",
        "target": ["var", ["", ".", ""], [["get", "x"], ["get", "y"]]],
        "source": ["+", ["var", ["", ".", ""], [["get", "x"], ["get", "y"]]], ["val", 1]],
        "next": null
    }
});

test([
    '{$20\n',
    '- 10}\n',
], {
    "start": {
        "type": "print",
        "expression": ["-", ["val", 20], ["val", 10]],
        "lift": "",
        "drop": "",
        "next": null
    },
});
