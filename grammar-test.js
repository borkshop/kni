'use strict';

var equals = require('pop-equals');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var grammar = require('./grammar');
var Story = require('./story');

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
    if (!equals(JSON.parse(JSON.stringify(story.states)), output)) {
        console.error('ERROR');
        console.error(input.join(''));
        console.error('expected');
        console.error(JSON.stringify(output, null, 4));
        console.error('actual');
        console.error(JSON.stringify(story.states, null, 4));
        global.fail = true;
    }
}

test([
], {
    start: {type: 'goto', next: null}
});

test([
    '= end\n'
], {
    start: {type: 'goto', next: "end"},
    end: {type: 'goto', next: null}
});

test([
    '= end\n',
    'The End\n'
], {
    start: {type: 'goto', next: 'end'},
    end: {type: 'text', text: 'The End', lift: '', drop: ' ', next: null}
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
        "text": "One",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Two",
        "lift": "",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Three",
        "lift": "",
        "drop": " ",
        "next": "start.3"
    },
    "start.3": {
        "type": "text",
        "text": "Four",
        "lift": "",
        "drop": " ",
        "next": "start.4"
    },
    "start.4": {
        "type": "text",
        "text": "Five",
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
        "text": "One",
        "lift": "",
        "drop": " ",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Two",
        "lift": "",
        "drop": " ",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Three",
        "lift": "",
        "drop": " ",
        "next": "start.3"
    },
    "start.3": {
        "type": "text",
        "text": "Four",
        "lift": "",
        "drop": " ",
        "next": "start.4"
    },
    "start.4": {
        "type": "text",
        "text": "Five",
        "lift": "",
        "drop": " ",
        "next": "start.5"
    },
    "start.5": {
        "type": "text",
        "text": "Six",
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
        "keywords": [],
        "branch": null,
        "next": null
    }
});

test([
    '+ Apples\n',
    '+ Oranges\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "keywords": [],
        "branch": null,
        "next": "start.1"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": null,
        "next": null
    }
});

test([
    '+ Apples\n',
    '  + Honeycrisps\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "keywords": [],
        "branch": "start.0.1",
        "next": null
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "keywords": [],
        "branch": null,
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
        "keywords": [],
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "keywords": [],
        "branch": null,
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
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
        "keywords": [],
        "branch": "start.1.1",
        "next": "start.2"
    },
    "start.1.1": {
        "type": "text",
        "text": "Charlie",
        "lift": "",
        "drop": " ",
        "next": "start.3"
    },
    "start.2": {
        "type": "option",
        "label": "Delta",
        "keywords": [],
        "branch": "start.2.1",
        "next": "start.3"
    },
    "start.2.1": {
        "type": "text",
        "text": "Echo",
        "lift": "",
        "drop": " ",
        "next": "start.3"
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
        "keywords": [],
        "branch": "start.3",
        "next": "start.2"
    },
    "start.2": {
        "type": "option",
        "label": "Charlie",
        "keywords": [],
        "branch": "start.3",
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
    '+ Apples\n',
    '  + Honeycrisps\n',
    '  + Braeburns\n',
    '+ Oranges\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "keywords": [],
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "keywords": [],
        "branch": null,
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "option",
        "label": "Braeburns",
        "keywords": [],
        "branch": null,
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
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
        "keywords": [],
        "branch": "start.0.1",
        "next": "start.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Honeycrisps",
        "keywords": [],
        "branch": "start.0.1.1",
        "next": "start.0.2"
    },
    "start.0.1.1": {
        "type": "option",
        "label": "Braeburns",
        "keywords": [],
        "branch": null,
        "next": "start.0.1.2"
    },
    "start.0.1.2": {
        "type": "option",
        "label": "Galas",
        "keywords": [],
        "branch": null,
        "next": null
    },
    "start.0.2": {
        "type": "option",
        "label": "Fujis",
        "keywords": [],
        "branch": null,
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": null,
        "next": null
    }
});

test([
    '= hi\n',
    'Hello, World!\n',
], {
    "start": {
        "type": "goto",
        "next": "hi"
    },
    "hi": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
        "drop": " ",
        "next": null
    }
});

test([
    '= hi Hello, World!\n',
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
    '-> start\n'
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
    '-> hi\n',
    '= hi\n'
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
    '-> hi\n',
    '= hi\n',
    'Hello, World!\n',
    '-> hi\n'
], {
    "start": {
        "type": "goto",
        "next": "hi"
    },
    "hi": {
        "type": "text",
        "text": "Hello, World!",
        "lift": "",
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
        "keywords": [],
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
    '+ You s[S]ay, "Hello, World!" /\n',
    '  They reply, "Good bye!"\n'
], {
    "start": {
        "type": "option",
        "label": "Say, \"Hello, World!\"",
        "keywords": [],
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
        "keywords": [],
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
        "keywords": [],
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
        "keywords": [],
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
        "keywords": []
    },
    "start.1": {
        "type": "option",
        "label": "Omega",
        "next": null,
        "branch": null,
        "keywords": []
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
        "branch": "start.1",
        "keywords": []
    },
    "start.1": {
        "type": "prompt"
    },
    "start.2": {
        "type": "option",
        "label": "Omega",
        "next": null,
        "branch": null,
        "keywords": []
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
        "keywords": []
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
        "keywords": [],
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
        "keywords": [],
        "branch": null,
        "next": null
    }
});

test([
    '* [Choice]\n',
    'Fin\n'
], {
    "start": {
        "type": "jnz",
        "variable": "start",
        "branch": "start.1",
        "next": "start.0.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "Choice",
        "next": "start.1",
        "branch": "start.0.2",
        "keywords": []
    },
    "start.0.2": {
        "type": "inc",
        "variable": "start",
        "next": "start.1"
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
    '* [One Fish]\n',
    '* [Two Fish]\n',
    'Fin\n'
], {
    "start": {
        "type": "jnz",
        "variable": "start",
        "branch": "start.1",
        "next": "start.0.1"
    },
    "start.0.1": {
        "type": "option",
        "label": "One Fish",
        "next": "start.1",
        "branch": "start.0.2",
        "keywords": []
    },
    "start.0.2": {
        "type": "inc",
        "variable": "start",
        "next": "start.2"
    },
    "start.1": {
        "type": "jnz",
        "variable": "start.1",
        "branch": "start.2",
        "next": "start.1.1"
    },
    "start.1.1": {
        "type": "option",
        "label": "Two Fish",
        "next": "start.2",
        "branch": "start.1.2",
        "keywords": []
    },
    "start.1.2": {
        "type": "inc",
        "variable": "start.1",
        "next": "start.2"
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
    '{}\n'
], {
    "start": {
        "type": "switch",
        "variable": "start",
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
        "variable": "start",
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
        "variable": "start",
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
        "variable": "start",
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
        "variable": "start.1",
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
        "variable": "start.1",
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
        "variable": "start",
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
        "variable": "start",
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
        "value": 1,
        "next": null
    }
});

test([
    '{=1 hi} Hello'
], {
    "start": {
        "type": "set",
        "variable": "hi",
        "value": 1,
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
        "type": "jz",
        "variable": "hi",
        "branch": null,
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
    '{!hi} Hello'
], {
    "start": {
        "type": "jnz",
        "variable": "hi",
        "branch": null,
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
    '- {!hi} Hello\n',
    'Bye\n',
], {
    "start": {
        "type": "jnz",
        "variable": "hi",
        "branch": "start.2",
        "next": "start.1"
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
        "type": "sub",
        "variable": "gil",
        "value": 10,
        "next": "start.1"
    },
    "start.1": {
        "type": "add",
        "variable": "arrow",
        "value": 1,
        "next": null
    }
});

test([
    "= top\n",
    "Text\n",
    "= bottom\n"
], {
    "start": {
        "type": "goto",
        "next": "top"
    },
    "top": {
        "type": "text",
        "text": "Text",
        "lift": "",
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
        "variable": "start.1",
        "next": null
    }
});

test([
    '{$arrow|no arrows|an arrow|{$arrow} arrows}\n'
], {
    "start": {
        "type": "switch",
        "variable": "arrow",
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
        "variable": "arrow",
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
        "variable": "arrow",
        "branches": [
            "start.0.1",
            "start.0.2"
        ],
        "value": 0,
        "mode": "walk"
    },
    "start.0.1": {
        "type": "print",
        "variable": "arrow",
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
        "variable": "door",
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
        "variable": "door",
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
        "variable": "knob",
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
        "variable": "gold",
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
        "variable": "gold",
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
        "type": "jne",
        "variable": "gold",
        "value": 0,
        "next": "start.1",
        "branch": "start.2"
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
        "type": "jeq",
        "variable": "gold",
        "value": 0,
        "next": "start.1",
        "branch": "start.2"
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
        "type": "jge",
        "variable": "gold",
        "value": 10,
        "next": "start.1",
        "branch": "start.2"
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
        "type": "jle",
        "variable": "gold",
        "value": 10,
        "next": "start.1",
        "branch": "start.2"
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
        "type": "jgt",
        "variable": "gold",
        "value": 10,
        "next": "start.1",
        "branch": "start.2"
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
        "type": "jlt",
        "variable": "gold",
        "value": 10,
        "next": "start.1",
        "branch": "start.2"
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
        "variable": "start.1",
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
        "variable": "start.1",
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
        "variable": "color",
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
    '=hello() Hello.',
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
    '- =hello(name) Hello, {$name}.\n',
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
        "variable": "name",
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
        "value": 10,
        "next": "hello"
    }
});
