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
    start: {type: 'goto', next: null},
    end: {type: 'goto', next: null}
});

test([
    '= end\n',
    'The End\n'
], {
    start: {type: 'goto', next: 'end'},
    end: {type: 'text', text: 'The End', next: null}
});

test([
    'Hello, World!\n'
], {
    start: {type: 'text', text: 'Hello, World!', next: null}
});

test([
    '  Hello, World!\n'
], {
    start: {type: 'text', text: 'Hello, World!', next: null}
});

test([
    'Hello, World!\n',
    '- Farewell.\n'
], {
    "start": {"type": "text", "text": "Hello, World!", "next": "start.1"},
    "start.1": {"type": "break", "next": "start.2"},
    "start.2": {"type": "text", "text": "Farewell.", "next": null},
});

test([
    '- Farewell.\n'
], {
    "start": {"type": "break", "next": "start.1"},
    "start.1": {"type": "text", "text": "Farewell.", "next": null},
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
        "type": "text",
        "text": "Farewell, World!",
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
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Farewell, World!",
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
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Two",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Three",
        "next": "start.3"
    },
    "start.3": {
        "type": "text",
        "text": "Four",
        "next": "start.4"
    },
    "start.4": {
        "type": "text",
        "text": "Five",
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
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Two",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Three",
        "next": "start.3"
    },
    "start.3": {
        "type": "break",
        "next": "start.4"
    },
    "start.4": {
        "type": "text",
        "text": "Four",
        "next": "start.5"
    },
    "start.5": {
        "type": "text",
        "text": "Five",
        "next": "start.6"
    },
    "start.6": {
        "type": "text",
        "text": "Six",
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
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": "Farewell, World!",
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
        "next": "start.1"
    },
    "start.1": {
        "type": "prompt"
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
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
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
        "type": "prompt"
    },
    "start.1": {
        "type": "prompt"
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
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "prompt"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": null,
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
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
        "next": "start.4"
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
        "next": "start.4"
    },
    "start.3": {
        "type": "prompt"
    },
    "start.4": {
        "type": "text",
        "text": "Foxtrot",
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
        "next": "start.1"
    },
    "start.1": {
        "type": "option",
        "label": "Bravo",
        "keywords": [],
        "branch": "start.4",
        "next": "start.2"
    },
    "start.2": {
        "type": "option",
        "label": "Charlie",
        "keywords": [],
        "branch": "start.4",
        "next": "start.3"
    },
    "start.3": {
        "type": "prompt"
    },
    "start.4": {
        "type": "text",
        "text": "Delta",
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
        "next": "start.0.3"
    },
    "start.0.3": {
        "type": "prompt"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": null,
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
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
        "next": "start.0.1.3"
    },
    "start.0.1.3": {
        "type": "prompt"
    },
    "start.0.2": {
        "type": "option",
        "label": "Fujis",
        "keywords": [],
        "branch": null,
        "next": "start.0.3"
    },
    "start.0.3": {
        "type": "prompt"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": null,
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
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
        "next": "start.1"
    },
    "start.0.1": {
        "type": "text",
        "text": "You say, \"Hello, World!\"",
        "next": null
    },
    "start.1": {
        "type": "prompt"
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
        "text": "You say, \"Hello, World!\"",
        "next": null
    },
    "start.1": {
        "type": "option",
        "label": "Say, \"Good bye.\"",
        "keywords": [],
        "branch": "start.1.1",
        "next": "start.2"
    },
    "start.1.1": {
        "type": "text",
        "text": "You say, \"Good bye.\"",
        "next": null
    },
    "start.2": {
        "type": "prompt"
    }
});

test([
    '+ Alpha\n',
    '-\n',
    '+ Omega\n'
], {
    "start": {
        "type": "option",
        "label": "Alpha",
        "next": "start.1",
        "branch": "start.2",
        "keywords": []
    },
    "start.1": {
        "type": "prompt"
    },
    "start.2": {
        "type": "option",
        "label": "Omega",
        "next": "start.3",
        "branch": null,
        "keywords": []
    },
    "start.3": {
        "type": "prompt"
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
        "next": "start.2",
        "branch": null,
        "keywords": []
    },
    "start.2": {
        "type": "prompt"
    }
});

test([
    '+ Alpha\n',
    '  - Omega\n'
], {
    "start": {
        "type": "option",
        "label": "Alpha",
        "next": "start.1",
        "branch": "start.0.1",
        "keywords": []
    },
    "start.0.1": {
        "type": "break",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "text",
        "text": "Omega",
        "next": null
    },
    "start.1": {
        "type": "prompt"
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
        "next": "start.1"
    },
    "start.0.1": {
        "type": "text",
        "text": "Omega",
        "next": null
    },
    "start.1": {
        "type": "prompt"
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
        "next": "start.1"
    },
    "start.1": {
        "type": "prompt"
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
        "next": "start.2"
    },
    "start.1": {
        "type": "prompt"
    },
    "start.2": {
        "type": "text",
        "text": "Fin",
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
        "next": "start.3"
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
        "next": "start.3"
    },
    "start.2": {
        "type": "prompt"
    },
    "start.3": {
        "type": "text",
        "text": "Fin",
        "next": null
    }
});

test([
    '{}\n'
], {
    "start": {
        "type": "sequence",
        "variable": "start",
        "branches": ["start.0.1"]
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
        "type": "sequence",
        "variable": "start",
        "branches": ["start.0.1", "start.0.2"]
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
        "type": "sequence",
        "variable": "start",
        "branches": ["start.0.1", "start.0.2", "start.0.3"]
    },
    "start.0.1": {
        "type": "text",
        "text": "Alpha",
        "next": null
    },
    "start.0.2": {
        "type": "text",
        "text": "Beta",
        "next": null
    },
    "start.0.3": {
        "type": "text",
        "text": "Gamma",
        "next": null
    }
});

test([
    '{Alpha|Bravo|Charlie}, Over\n'
], {
    "start": {
        "type": "sequence",
        "variable": "start",
        "branches": ["start.0.1", "start.0.2", "start.0.3"]
    },
    "start.0.1": {
        "type": "text",
        "text": "Alpha",
        "next": "start.1"
    },
    "start.0.2": {
        "type": "text",
        "text": "Bravo",
        "next": "start.1"
    },
    "start.0.3": {
        "type": "text",
        "text": "Charlie",
        "next": "start.1"
    },
    "start.1": {
        "type": "text",
        "text": ", Over",
        "next": null
    }
});

test([
    'Counting down, {Three|Two|One}, Lift-off\n'
], {
    "start": {
        "type": "text",
        "text": "Counting down,",
        "next": "start.1",
    },
    "start.1": {
        "type": "sequence",
        "variable": "start.1",
        "branches": ["start.1.1", "start.1.2", "start.1.3"]
    },
    "start.1.1": {
        "type": "text",
        "text": "Three",
        "next": "start.2"
    },
    "start.1.2": {
        "type": "text",
        "text": "Two",
        "next": "start.2"
    },
    "start.1.3": {
        "type": "text",
        "text": "One",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": ", Lift-off",
        "next": null
    }
});

test([
    'Counting down, {Three||One}, Lift-off\n'
], {
    "start": {
        "type": "text",
        "text": "Counting down,",
        "next": "start.1",
    },
    "start.1": {
        "type": "sequence",
        "variable": "start.1",
        "branches": ["start.1.1", "start.1.2", "start.1.3"]
    },
    "start.1.1": {
        "type": "text",
        "text": "Three",
        "next": "start.2"
    },
    "start.1.2": {
        "type": "goto",
        "next": "start.2"
    },
    "start.1.3": {
        "type": "text",
        "text": "One",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": ", Lift-off",
        "next": null
    }
});

test([
    '{Win! -> win}\n'
], {
    "start": {
        "type": "sequence",
        "variable": "start",
        "branches": ["start.0.1"]
    },
    "start.0.1": {
        "type": "text",
        "text": "Win!",
        "next": "win"
    }
});

only([
    '{=1 hi}'
], {
    "start": {
        "type": "set",
        "variable": "hi",
        "value": 1,
        "next": null
    }
});

only([
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
        "next": null
    }
});

only([
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
        "next": null
    }
});

only([
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
        "next": null
    }
});

only([
    '- {!hi} Hello\n',
    'Bye\n',
], {
    "start": {
        "type": "break",
        "next": "start.1",
    },
    "start.1": {
        "type": "jnz",
        "variable": "hi",
        "branch": "start.3",
        "next": "start.2"
    },
    "start.2": {
        "type": "text",
        "text": "Hello",
        "next": "start.3"
    },
    "start.3": {
        "type": "text",
        "text": "Bye",
        "next": null
    }
});
