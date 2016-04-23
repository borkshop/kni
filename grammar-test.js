'use strict';

var equals = require('pop-equals');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var grammar = require('./grammar');
var Story = require('./story');

function test(input, output) {
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
    start: {type: 'end'}
});

test([
    'Hello, World!\n'
], {
    start: {type: 'text', text: 'Hello, World!', next: 'end'},
    end: {type: 'end'}
});

test([
    '  Hello, World!\n'
], {
    start: {type: 'text', text: 'Hello, World!', next: 'end'},
    end: {type: 'end'}
});

test([
    'Hello, World!\n',
    '- Farewell.\n'
], {
    "start": {"type": "text", "text": "Hello, World!", "next": "start.1"},
    "start.1": {"type": "break", "next": "start.2"},
    "start.2": {"type": "text", "text": "Farewell.", "next": "end"},
    "end": {"type": "end"}
});

test([
    '- Farewell.\n'
], {
    "start": {"type": "break", "next": "start.1"},
    "start.1": {"type": "text", "text": "Farewell.", "next": "end"},
    "end": {"type": "end"}
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
        "next": "end"
    },
    "end": {
        "type": "end"
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
        "next": "end"
    },
    "end": {
        "type": "end"
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
        "next": "end"
    },
    "end": {
        "type": "end"
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
        "next": "end"
    },
    "end": {
        "type": "end"
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
        "next": "end"
    },
    "end": {
        "type": "end"
    }
});

test([
    '+ Apples\n',
], {
    "start": {
        "type": "option",
        "label": "Apples",
        "keywords": [],
        "branch": "end",
        "next": "start.1"
    },
    "start.1": {
        "type": "prompt"
    },
    "end": {
        "type": "end"
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
        "branch": "end",
        "next": "start.1"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": "end",
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
    },
    "end": {
        "type": "end"
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
        "branch": "end",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "prompt"
    },
    "start.1": {
        "type": "prompt"
    },
    "end": {
        "type": "end"
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
        "branch": "end",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "prompt"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": "end",
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
    },
    "end": {
        "type": "end"
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
        "next": "end"
    },
    "end": {
        "type": "end"
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
        "next": "end"
    },
    "end": {
        "type": "end"
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
        "branch": "end",
        "next": "start.0.2"
    },
    "start.0.2": {
        "type": "option",
        "label": "Braeburns",
        "keywords": [],
        "branch": "end",
        "next": "start.0.3"
    },
    "start.0.3": {
        "type": "prompt"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": "end",
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
    },
    "end": {
        "type": "end"
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
        "branch": "end",
        "next": "start.0.1.2"
    },
    "start.0.1.2": {
        "type": "option",
        "label": "Galas",
        "keywords": [],
        "branch": "end",
        "next": "start.0.1.3"
    },
    "start.0.1.3": {
        "type": "prompt"
    },
    "start.0.2": {
        "type": "option",
        "label": "Fujis",
        "keywords": [],
        "branch": "end",
        "next": "start.0.3"
    },
    "start.0.3": {
        "type": "prompt"
    },
    "start.1": {
        "type": "option",
        "label": "Oranges",
        "keywords": [],
        "branch": "end",
        "next": "start.2"
    },
    "start.2": {
        "type": "prompt"
    },
    "end": {
        "type": "end"
    }
});

test([
    '= hi\n',
    'Hello, World!\n',
], {
    "hi": {
        "type": "text",
        "text": "Hello, World!",
        "next": "end"
    },
    "end": {
        "type": "end"
    }
});

test([
    '= hi Hello, World!\n',
], {
    "hi": {
        "type": "text",
        "text": "Hello, World!",
        "next": "end"
    },
    "end": {
        "type": "end"
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
        "label": "hi"
    },
    "hi": {
        "type": "text",
        "text": "Hello, World!",
        "next": "hi.1"
    },
    "hi.1": {
        "type": "goto",
        "label": "hi",
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
        "next": "end"
    },
    "start.1": {
        "type": "prompt"
    },
    "end": {
        "type": "end"
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
        "next": "end"
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
        "next": "end"
    },
    "start.2": {
        "type": "prompt"
    },
    "end": {
        "type": "end"
    }
});

