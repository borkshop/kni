'use strict';

var Path = require('./path');
var story = require('./story');
var expression = require('./expression');

exports.start = start;

function start(story) {
    var path = ['start'];
    var stop = new Stop();
    var start = story.create(path, 'goto', null);
    return new Knot(story, ['start', 0], stop, [start]);
}

function Stop() {
    this.type = 'end';
    Object.seal(this);
}

// istanbul ignore next
Stop.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'stop') {
        return new End();
    } else {
        throw new Error('expected end of file, got ' + type + ' ' + text);
    }
};

Stop.prototype.return = function _return() {
    return this;
};

function End() {}

// istanbul ignore next
End.prototype.next = function next(type, space, text, scanner) {
    throw new Error('nodes beyond root ' + type + ' ' + JSON.stringify(text));
};

function Knot(story, path, parent, ends, prevs) {
    this.type = 'knot';
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.prevs = prevs || [];
    this.story = story;
    Object.seal(this);
}

Knot.prototype.next = function next(type, space, text, scanner) {
    if (type === 'text' || type === 'number') {
        return new Text(this.story, this.path, space, text, this, this.ends.concat(this.prevs));
    }  else if (type === 'token') {
        if (text === '{') {
            return new Block(this.story, this.path, this, this.ends.concat(this.prevs));
        } else if (text === '=') {
            return new ExpectLabel(this.story, this.path, this.parent, this.ends.concat(this.prevs));
        } else if (text === '->') {
            return new Goto(this.story, this.path, this, this.ends.concat(this.prevs));
        } else if (text === '<-') {
            return new Knot(this.story, this.path, this.parent, []);
        } else if (text === '/') {
            var node = this.story.create(this.path, 'break');
            tie(this.ends.concat(this.prevs), this.path);
            return new Knot(this.story, Path.next(this.path), this.parent, [node]);
        } else if (text === '>') {
            var node = this.story.create(this.path, 'prompt');
            tie(this.prevs, this.path);
            return new Knot(this.story, Path.next(this.path), this.parent, this.ends);
        }
    } else if (type === 'start') {
        if (text === '+' || text === '*') {
            tie(this.ends.concat(this.prevs), this.path);
            return new Option(text, this.story, this.path, this, []);
        } else if (text === '-') {
            return new Knot(this.story, this.path, new Indent(this), this.ends.concat(this.prevs));
        } else if (text === '=') {
            return new LabelThread(this.story, this.path, this, this.ends.concat(this.prevs));
        } else {
            return new Knot(this.story, this.path, new Indent(this), this.ends.concat(this.prevs));
        }
    } else if (type === 'dash') {
        var node = this.story.create(this.path, 'paragraph');
        tie(this.ends.concat(this.prevs), this.path);
        return new Knot(this.story, Path.next(this.path), this.parent, [node]);
    } else if (type === 'break') {
        return this;
    }
    return this.parent.return(this.path, this.ends, this.prevs, scanner)
        .next(type, space, text, scanner);
};

Knot.prototype.return = function _return(path, ends, prevs, scanner) {
    return new Knot(this.story, path, this.parent, ends, prevs);
};

function Indent(parent) {
    this.parent = parent;
}

Indent.prototype.return = function _return(path, ends, prevs, scanner) {
    return new Expect('stop', '', path, this.parent, ends.concat(prevs));
};

function Text(story, path, lift, text, parent, ends) {
    this.type = 'text';
    this.story = story;
    this.path = path;
    this.lift = lift;
    this.text = text;
    this.parent = parent;
    this.ends = ends;
}

Text.prototype.next = function next(type, space, text, scanner) {
    if (type === 'text' || type === 'number') {
        this.text += space + text;
        return this;
    } else {
        tie(this.ends, this.path);
        var node = this.story.create(this.path, 'text', this.text);
        node.lift = this.lift;
        node.drop = space;
        return this.parent.return(Path.next(this.path), [node], [], scanner)
            .next(type, space, text, scanner);
    }
};

function Pretext(lift, text, drop) {
    this.lift = lift || '';;
    this.text = text || '';
    this.drop = drop || '';
}

function Option(leader, story, path, parent, ends) {
    this.type = 'option';
    this.leader = leader;
    this.story = story;
    this.path = path;
    this.name = Path.toName(path);
    this.parent = parent;
    this.ends = ends; // to tie off to the next node after the entire option list
    this.continues = []; // to tie off to the next option
    this.question = new Pretext();
    this.answer = new Pretext();
    this.common = new Pretext();
    this.position = 0;
    this.direction = 1;
    Object.seal(this);
}

//    You then s   [S]      ay Hello, World!
//    0   1    1    2 3     4  5      5
//    Answer  Question Common
//
//    "Hello, World ]!"        [," you reply.
//    0       1     -2      -3 4   5   5
//    Common         Question  Answer
Option.prototype.next = function next(type, space, text, scanner) {
    if ((type === 'text' || type === 'number') && this.position === 0) {
        this.answer.lift = space;
        this.answer.text = text;
        this.position = 1;
        return this;
    } else if ((type === 'text' || type === 'number') && this.position === 1) {
        this.answer.text += space + text;
        return this;
    } else if (type === 'token' && text === '[' && (this.position === 0 || this.position === 1)) {
        this.position = 2;
        return this;
    } else if (type === 'token' && text === ']' && (this.position === 0 || this.position === 1)) {
        this.direction = -1;
        this.position = -2;
        return this;
    } else if ((type === 'text' || type === 'number') && this.position === 2 * this.direction) {
        this.answer.drop = space;
        this.question.lift = space;
        this.question.text = text;
        this.position = 3 * this.direction;
        return this;
    } else if ((type === 'text' || type === 'number') && this.position === 3 * this.direction) {
        this.question.text += space + text;
        return this;
    } else if (type === 'token' && text === ']' && (this.position === 2 || this.position === 3)) {
        this.question.drop = space;
        this.position = 4;
        return this;
    } else if (type === 'token' && text === '[' && (this.position === -2 || this.position === -3)) {
        this.question.drop = space;
        this.position = 4;
        return this;
    } else if ((type === 'text' || type === 'number') && this.position === 4) {
        this.question.drop = space;
        this.common.lift = space;
        this.common.text = text;
        this.position = 5;
        return this;
    } else if ((type === 'text' || type === 'number') && this.position === 5) {
        this.common.text += space + text;
        return this;
    } else if (this.position === 0 || this.position === 1) {
        this.answer.drop = space;
        // If we get here, it means we only populated the answer, and didn't
        // see any bracket notation.
        // In this case, the "answer" we collected is actually the "common",
        // meaning it serves for both the question and answer for the option.
        return this.create(null, null, this.answer, this.direction, type, space, text, scanner);
    // istanbul ignore next
    } else if (this.position === 2 || this.position === 3) {
        throw new Error('expected matching ]');
    } else {
        this.common.drop = space;
        return this.create(this.answer, this.question, this.common, this.direction, type, space, text, scanner);
    }
};

Option.prototype.create = function create(answer, question, common, direction, type, space, text, scanner) {
    var variable = Path.toName(this.path);
    var path = this.path;

    if (this.leader === '*') {
        var jnz = this.story.create(path, 'jnz', variable);
        var jnzBranch = new Branch(jnz);
        this.continues.push(jnzBranch);
        path = Path.firstChild(path);
        tie([jnz], path);
    }

    var option;
    if (question) {
        if (this.direction > 0) {
            option = this.story.create(path, 'option', question.text + question.drop + common.text);
        } else {
            option = this.story.create(path, 'option', answer.text + answer.drop + question.text);
        }
    } else {
        option = this.story.create(path, 'option', common.text);
    }
    this.continues.push(option);

    if (this.leader === '*') {
        path = Path.next(path);
    } else {
        path = Path.firstChild(path);
    }

    var prev = new Branch(option);
    var next;

    if (this.leader === '*') {
        next = this.story.create(path, 'set', variable);
        next.expression = ['+', ['get', variable], ['val', 1]];
        tie([prev], path);
        path = Path.next(path);
        prev = next;
    }

    if (answer && answer.text) {
        next = this.story.create(path, 'text', answer.text);
        next.lift = answer.lift;
        next.drop = answer.drop;
        tie([prev], path);
        path = Path.next(path);
        prev = next;
    }

    if (question && common.text) {
        next = this.story.create(path, 'text', common.text);
        next.lift = common.lift;
        next.drop = common.drop;
        tie([prev], path);
        path = Path.next(path);
        prev = next;
    }

    var state = new Knot(this.story, path, new Indent(this), [prev]);

    if (text !== '/') {
        state = state.next(type, space, text, scanner);
    }

    return state;
};

Option.prototype.return = function _return(path, ends, prevs, scanner) {
    return new MaybeOption(this.story, Path.next(this.path), this.parent, this.continues.concat(prevs), this.ends.concat(ends));
};

function MaybeOption(story, path, parent, continues, ends) {
    this.type = 'maybe-option';
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.story = story;
    this.continues = continues;
    Object.seal(this);
}

MaybeOption.prototype.next = function next(type, space, text, scanner) {
    if (type === 'start' && (text === '+' || text === '*')) {
        tie(this.continues, this.path);
        return new Option(text, this.story, this.path, this.parent, this.ends);
    } else {
        return this.parent.return(this.path, this.ends, this.continues, scanner)
            .next(type, '', text, scanner);
    }
};

function Branch(node) {
    this.type = 'branch';
    this.node = node;
    Object.seal(this);
}

Branch.prototype.tie = function tie(path) {
    this.node.branch = path;
};

function ExpectLabel(story, path, parent, ends) {
    this.type = 'label';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

ExpectLabel.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'text') {
        return new MaybeSubroutine(this.story, this.path, this.parent, this.ends, text);
    } else {
        // TODO produce a readable error using scanner
        throw new Error('expected label after =, got ' + type + ' ' + text + ' ' + scanner.position());
    }
};

function LabelThread(story, path, parent, ends) {
    this.type = 'label-thread';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

LabelThread.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'text') {
        return new MaybeSubroutine(this.story, this.path, this, this.ends, text);
    } else {
        // TODO produce a readable error using scanner
        throw new Error('expected label after =, got ' + type + ' ' + text + ' ' + scanner.position());
    }
};

LabelThread.prototype.return = function _return(path, ends, prevs, scanner) {
    return new Expect('stop', '', path, this.parent, ends.concat(prevs));
};

function MaybeSubroutine(story, path, parent, ends, label) {
    this.type = 'maybe-subroutine';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.label = label;
}

MaybeSubroutine.prototype.next = function next(type, space, text, scanner) {
    if (type === 'text' && text === '(') {
        return new Subroutine(this.story, this.path, this.parent, this.ends, this.label);
    } else {
        var path = [this.label, 0];
        var label = this.story.create(path, 'goto', null);
        tie(this.ends, path);
        return new Knot(this.story, path, this.parent, this.ends.concat([label]))
            .next(type, space, text, scanner);
    }
};

function Subroutine(story, path, parent, ends, label) {
    this.type = 'subroutine';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.label = label;
    this.locals = [];
}

Subroutine.prototype.next = function next(type, space, text, scanner) {
    if (type === 'text' && text === ')') {
        var path = [this.label, 0];
        var label = this.story.create(path, 'goto', null);

        // Leave the loose ends from before the subroutine declaration for
        // after the subroutine declaration is complete.

        // The subroutine exists only for reference in calls.
        var sub = this.story.create(path, 'subroutine', this.locals);

        return new Knot(this.story, Path.next(path), this, [label, sub]);
    // istanbul ignore else
    } else if (type === 'text') {
        this.locals.push(text);
        return this;
    } else {
        throw new Error('expected variable name or close paren');
    }
};

Subroutine.prototype.return = function _return(path, ends, prevs, scanner) {
    // Let loose ends of subroutine dangle to null.
    // Pick up the threads left before the subroutine declaration.
    return this.parent.return(Path.next(this.path), this.ends, [], scanner);
};

function Goto(story, path, parent, ends) {
    this.type = 'goto';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

Goto.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'text') {
        tieName(this.ends, text);
        return this.parent.return(Path.next(this.path), [], [], scanner);
    } else {
        throw new Error('Unexpected token after goto arrow: ' + type + ' ' + text + ' ' + scanner.position());
    }
};

function Call(story, path, parent, ends) {
    this.type = 'call';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.node = null;
    this.label = null;
}

Call.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'text') {
        this.label = text;
        this.node = this.story.create(this.path, 'call', this.label);
        var branch = new Branch(this.node);
        tie(this.ends, this.path);
        return new Knot(this.story, Path.firstChild(this.path), this, [branch]);
    } else {
        throw new Error('Unexpected token after goto arrow: ' + type + ' ' + text + ' ' + scanner.position());
    }
};

Call.prototype.return = function _return(path, ends, prevs, scanner) {
    tieName(ends.concat(prevs), this.label);
    return new Expect('token', '}', Path.next(this.path), this.parent, [this.node]);
};

function Block(story, path, parent, ends) {
    this.type = 'block';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

var comparators = {
    '>': 'jgt',
    '<': 'jlt',
    '>=': 'jge',
    '<=': 'jle',
    '==': 'jeq',
    '!=': 'jne'
};

var jumps = {
    '?': 'jz',
    '!': 'jnz'
};

var mutators = {
    '=': 'set',
    '+': 'add',
    '-': 'sub',
    '*': 'mul',
    '/': 'div',
};

var variables = {
    '$': 'walk',
    '@': 'loop',
    '#': 'hash'
};

var switches = {
    '%': 'loop',
    '~': 'rand'
};

Block.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token' || type === 'text' || type === 'number') {
        if (jumps[text]) {
            return new Jump(this.story, this.path, this.parent, this.ends, jumps[text]);
        } else if (comparators[text]) {
            return new JumpCompare(this.story, this.path, this.parent, this.ends, comparators[text]);
        } else if (mutators[text]) {
            return new Set(this.story, this.path, this.parent, this.ends, text);
        } else if (variables[text]) {
            return new Variable(this.story, this.path, this.parent, this.ends, variables[text]);
        } else if (switches[text]) {
            return new Switch(this.story, this.path, this.parent, this.ends)
                .start(null, null, switches[text])
                .case();
        } else if (text === '->') {
            return new Call(this.story, this.path, this.parent, this.ends);
        }
    }
    return new Switch(this.story, this.path, this.parent, this.ends)
        .start(null, 1, 'walk') // with variable and value, waiting for case to start
        .case() // first case
        .next(type, space, text, scanner);
};

function JumpCompare(story, path, parent, ends, type) {
    this.type = type;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.branch = null;
    this.variable = null;
    this.value = null;
    this.position = 0;
}

JumpCompare.prototype.next = function next(type, space, text, scanner) {
    if (this.position === 0) {
        // istanbul ignore else
        if (type === 'number') {
            this.value = parseInt(text, 10);
            this.position = 1;
            return this;
        }
    // istanbul ignore else
    } else if (this.position === 1) {
        // istanbul ignore else
        if (type === 'text') {
            this.variable = text;
            this.position = 2;
            return this;
        }
    } else if (this.position === 2) {
        var node = this.story.create(this.path, this.type, this.variable);
        this.branch = new Branch(node);
        node.value = this.value;
        tie(this.ends, this.path);
        return new Knot(this.story, Path.next(this.path), this, [node]);
    }
    // istanbul ignore next
    throw new Error('Unexpected token in ' + this.type + ': ' + type + ' ' + text + ' ' + scanner.position());
};

JumpCompare.prototype.return = function _return(path, ends, prevs, scanner) {
    return this.parent.return(path, ends.concat(prevs, [this.branch]), [], scanner);
};

function Jump(story, path, parent, ends, type) {
    this.type = type;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.branch = null;
    this.variable = null;
    this.position = 0;
}

Jump.prototype.next = function next(type, space, text, scanner) {
    if (this.position === 0) {
        // istanbul ignore else
        if (type === 'text') {
            this.variable = text;
            this.position = 1;
            return this;
        }
    // istanbul ignore else
    } else if (this.position === 1) {
        // istanbul ignore else
        if (text === '}') {
            this.node = this.story.create(this.path, this.type, this.variable);
            this.branch = new Branch(this.node);
            tie(this.ends, this.path);
            return new Knot(this.story, Path.next(this.path), this, [this.node]);
        }
    }
    // istanbul ignore next
    throw new Error('Unexpected token in jump: ' + type + ' ' + text + ' ' + scanner.position());
};

Jump.prototype.return = function _return(path, ends, prevs, scanner) {
    return this.parent.return(path, ends.concat(prevs, [this.branch]), [], scanner);
};

function Set(story, path, parent, ends, op) {
    this.type = 'set';
    this.op = op;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

Set.prototype.next = function next(type, space, text, scanner) {
    if (text === '(') {
        return expression(this);
    } else if (type === 'number') {
        return this.return(['val', parseInt(text, 10)]);
    // istanbul ignore else
    } else if (type === 'text') {
        return this.return(['val', 1])
            .next(type, space, text, scanner);
    }
    // istanbul ignore next
    throw new Error('Unexpected token in ' + this.type + ': ' + type + ' ' + text + ' ' + scanner.position());
};

Set.prototype.return = function _return(expression) {
    return new ExpectSetVariable(this.story, this.path, this.parent, this.ends, this.op, expression);
};

function ExpectSetVariable(story, path, parent, ends, op, expression) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.op = op;
    this.expression = expression;
}

ExpectSetVariable.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'text') {
        var variable = text;
        var node = this.story.create(this.path, 'set', variable);
        if (this.op === '=') {
            node.expression = this.expression;
        } else {
            node.expression = [this.op, ['get', variable], this.expression];
        }
        tie(this.ends, this.path);
        return new Expect('token', '}', Path.next(this.path), this.parent, [node]);
    }
    // istanbul ignore next
    throw new Error('Expected variable name, got ' + type + ' ' + text);
};

function Variable(story, path, parent, ends, mode) {
    this.type = 'variable';
    this.mode = mode;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.variable = null;
    this.position = 0;
}

Variable.prototype.next = function next(type, space, text, scanner) {
    if (this.position === 0) {
        // istanbul ignore else
        if (type === 'text') {
            this.variable = text;
            this.position++;
            return this;
        }
    // istanbul ignore else
    } else if (this.position === 1) {
        if (text === '|') {
            return new Switch(this.story, this.path, this.parent, this.ends)
                .start(this.variable, 0, this.mode)
                .case();
        // istanbul ignore else
        } else if (text === '}') {
            // istanbul ignore else
            if (this.mode === 'walk') {
                var node = this.story.create(this.path, 'print', this.variable);
                tie(this.ends, this.path);
                return new Knot(this.story, Path.next(this.path), this.parent, [node]);
            }
        }
    }
    // istanbul ignore next
    throw new Error('Unexpected token in jump: ' + type + ' ' + text + ' ' + scanner.position());
};

function Switch(story, path, parent, ends) {
    this.type = 'switch';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.branches = [];
}

Switch.prototype.start = function start(variable, value, mode) {
    value = value || 0;
    if (mode === 'loop' && !variable) {
        value = 1;
    }
    variable = variable || Path.toName(this.path);
    var node = this.story.create(this.path, 'switch', variable);
    node.value = value;
    node.mode = mode;
    tie(this.ends, this.path);
    node.branches = this.branches;
    return new Case(this.story, Path.firstChild(this.path), this, [], this.branches);
};

Switch.prototype.return = function _return(path, ends, prevs, scanner) {
    return new Expect('token', '}', Path.next(this.path), this.parent, ends.concat(prevs));
};

function Case(story, path, parent, ends, branches) {
    this.type = 'case';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.branches = branches;
}

Case.prototype.next = function next(type, space, text, scanner) {
    if (text === '|') {
        return this.case();
    } else {
        return this.parent.return(this.path, this.ends, [], scanner)
            .next(type, space, text, scanner);
    }
};

Case.prototype.case = function _case() {
    var path = Path.zerothChild(this.path);
    var node = this.story.create(path, 'goto', null);
    this.branches.push(Path.toName(path));
    return new Knot(this.story, path, this, [node]);
};

Case.prototype.return = function _return(path, ends, prevs, scanner) {
    return new Case(this.story, Path.next(this.path), this.parent, this.ends.concat(ends, prevs), this.branches);
};

function Expect(type, text, path, parent, ends) {
    this.type = 'expect';
    this.expect = type;
    this.text = text;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

Expect.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === this.expect && text === this.text) {
        return this.parent.return(this.path, this.ends, [], scanner);
    } else {
        throw new Error('expected ' + this.expect + ' ' + this.text + ', got ' + type + ' ' + text);
    }
};

function tie(ends, next) {
    var name = Path.toName(next);
    tieName(ends, name);
}

function tieName(ends, name) {
    for (var i = 0; i < ends.length; i++) {
        var end = ends[i];
        end.tie(name);
    }
}
