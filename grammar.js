'use strict';

var Path = require('./path');
var story = require('./story');
var expression = require('./expression');

exports.start = start;

function start(story) {
    var path = Path.start();
    var stop = new Stop(story);
    var start = story.create(path, 'goto', null);
    return new Thread(story, Path.zerothChild(path), stop, [start], []);
}

function Stop(story) {
    this.type = 'end';
    this.story = story;
    Object.seal(this);
}

// istanbul ignore next
Stop.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type !== 'stop') {
        this.story.error('Expected end of file, got ' + type + '/' + text + ' at ' + scanner.position());
    }
    return new End();
};

Stop.prototype.return = function _return() {
    return this;
};

function End() {
    this.type = 'end';
    Object.seal(this);
}

// istanbul ignore next
End.prototype.next = function next(type, space, text, scanner) {
    return this;
};

// ends are tied to the next instruction
// jumps are tied off after the next encountered prompt
function Thread(story, path, parent, ends, jumps) {
    this.type = 'thread';
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    this.story = story;
    Object.seal(this);
}

Thread.prototype.next = function next(type, space, text, scanner) {
    if (type === 'symbol'|| type === 'alphanum' || type === 'number' || type === 'literal' || text === '--' || text === '---') {
        return new Text(this.story, this.path, space, text, this, this.ends);
    }  else if (type === 'token') {
        if (text === '{') {
            return new Block(this.story, this.path, this, this.ends);
        } else if (text === '@') {
            return expression.variable(this.story, new ExpectLabel(this.story, this.path, this, this.ends));
        } else if (text === '->') {
            return expression.variable(this.story, new Goto(this.story, this.path, this, this.ends));
        } else if (text === '<-') {
            // Implicitly tie ends to null by dropping them.
            // Continue carrying jumps to the next encountered prompt.
            // Advance the path so that option thread don't appear empty.
            return new Thread(this.story, Path.next(this.path), this.parent, [], this.jumps);
        } else if (text === '/') {
            var node = this.story.create(this.path, 'break');
            tie(this.ends, this.path);
            return new Thread(this.story, Path.next(this.path), this.parent, [node], this.jumps);
        } else if (text === '//') {
            var node = this.story.create(this.path, 'paragraph');
            tie(this.ends, this.path);
            return new Thread(this.story, Path.next(this.path), this.parent, [node], this.jumps);
        } else if (text === '{"' || text === '{\'' || text === '"}' || text === '\'}') {
            return new Text(this.story, this.path, space, '', this, this.ends)
                .next(type, '', text, scanner);
        }
    } else if (type === 'start') {
        if (text === '+' || text === '*') {
            return new MaybeOption(this.story, this.path, this, this.ends, this.jumps, text);
        } else if (text === '-') {
            return new Thread(this.story, this.path, new Indent(this.story, this), this.ends, []);
        } else if (text === '>') {
            var node = this.story.create(this.path, 'prompt');
            // tie off ends to the prompt.
            tie(this.ends, this.path);
            // promote jumps to ends, tying them off after the prompt.
            return new Thread(this.story, Path.next(this.path), new Indent(this.story, this), this.jumps, []);
        } else { // if text === '!') {
            return new Program(this.story, this.path, new Indent(this.story, this), this.jumps, []);
        }
    } else if (type === 'dash') {
        var node = this.story.create(this.path, 'rule');
        tie(this.ends, this.path);
        return new Thread(this.story, Path.next(this.path), this.parent, [node], this.jumps);
    } else if (type === 'break') {
        return this;
    }
    if (type === 'stop' || text === '|' || text === ']' || text === '[' || text === '}') {
        return this.parent.return(this.path, this.ends, this.jumps, scanner)
            .next(type, space, text, scanner);
    }
    return new Text(this.story, this.path, space, text, this, this.ends);
};

Thread.prototype.return = function _return(path, ends, jumps, scanner) {
    // All rules above (in next) guarantee that this.ends has been passed to
    // any rule that might use them. If the rule fails to use them, they must
    // return them. However, jumps are never passed to any rule that returns.
    return new Thread(this.story, path, this.parent, ends, this.jumps.concat(jumps));
};

function Indent(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

Indent.prototype.return = function _return(path, ends, jumps, scanner) {
    return new Expect('stop', '', this.story, path, this.parent, ends, jumps);
};

function Text(story, path, lift, text, parent, ends) {
    this.type = 'text';
    this.story = story;
    this.path = path;
    this.lift = lift;
    this.text = text;
    this.parent = parent;
    this.ends = ends;
    Object.seal(this);
}

Text.prototype.next = function next(type, space, text, scanner) {
    if (type === 'alphanum' || type === 'number' || type === 'symbol' || type === 'literal') {
        this.text += space + text;
        return this;
    } else if (type === 'token') {
        if (text === '{"') {
            this.text += space + '“';
            return this;
        } else if (text === '"}') {
            this.text += space + '”';
            return this;
        } else if (text === '{\'') {
            this.text += space + '‘';
            return this;
        } else if (text === '\'}') {
            this.text += space + '’';
            return this;
        }
    } else if (text === '--') {
        this.text += space + '–'; // en-dash
        return this;
    } else if (text === '---') {
        this.text += space + '—'; // em-dash
        return this;
    }
    tie(this.ends, this.path);
    var node = this.story.create(this.path, 'text', this.text);
    node.lift = this.lift;
    node.drop = space;
    return this.parent.return(Path.next(this.path), [node], [], scanner)
        .next(type, space, text, scanner);
};

function MaybeOption(story, path, parent, ends, jumps, leader) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    this.leader = leader;
    this.conditions = [];
    this.consequences = [];
    this.at = path;
    this.descended = false;
    Object.seal(this);
}

MaybeOption.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token') {
        if (text === '{') {
            return new OptionOperator(this.story,
                new MiniExpect('token', '}', this.story, this));
        }
    }
    return this.option().next(type, space, text, scanner);
};

MaybeOption.prototype.return = function _return(operator, expression, modifier) {
    if (operator === '+' || operator === '-') {
        modifier = modifier || ['val', 1];
        this.consequences.push([expression, [operator, expression, modifier]]);
    }
    if (operator === '-') {
        this.conditions.push(['>=', expression, modifier]);
    }
    if (operator === '?') {
        this.conditions.push(expression);
    }
    return this;
};

MaybeOption.prototype.advance = function advance() {
    if (this.descended) {
        this.at = Path.next(this.at);
    } else {
        this.at = Path.firstChild(this.at);
        this.descended = true;
    }
};

MaybeOption.prototype.option = function option() {
    var variable = Path.toName(this.path);
    var ends = [];

    tie(this.ends, this.at);

    if (this.leader === '*') {
        this.consequences.push([['get', variable], ['+', ['get', variable], ['val', 1]]]);
        var jump = this.story.create(this.at, 'jump', ['!=', ['get', variable], ['val', 0]]);
        var jumpBranch = new Branch(jump);
        ends.push(jumpBranch);
        this.advance();
        tie([jump], this.at);
    }

    for (var i = 0; i < this.conditions.length; i++) {
        var condition = this.conditions[i];
        var jump = this.story.create(this.at, 'jump', ['==', condition, ['val', 0]]);
        var jumpBranch = new Branch(jump);
        ends.push(jumpBranch);
        this.advance();
        tie([jump], this.at);
    }

    var option = new Option(this.story, this.path, this.parent, ends, this.jumps, this.leader, this.consequences);
    option.node = this.story.create(this.at, 'option', null);
    this.advance();

    option.next = this.at;
    return option.thread(
        new OptionThread(this.story, this.at, option, [], option, 'qa', AfterInitialQA));
};

// {+x} {-x} or {(x)}
function OptionOperator(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

OptionOperator.prototype.next = function next(type, space, text, scanner) {
    if (text === '+' || text === '-') {
        return expression(this.story,
            new OptionArgument(this.story, this.parent, text));
    } else if (text === '(') {
        return expression(this.story,
            new OptionArgument2(this.story, this.parent, '?'))
                .next(type, space, text, scanner);
    } else {
        // TODO consider ending option operator sequence and replaying prior tokens
        this.story.error('Expected +, -, or (expression) for option condition, got ' + type + '/' + text + ' at ' + scanner.position());
        return expression(this.story,
            new OptionArgument2(this.story, this.parent, '?'))
                .next(type, space, text, scanner);
    }
};

function OptionArgument(story, parent, operator) {
    this.story = story;
    this.parent = parent;
    this.operator = operator;
    Object.seal(this);
}

OptionArgument.prototype.return = function _return(args, scanner) {
    if (args[0] === 'get' || args[0] === 'var') {
        return this.parent.return(this.operator, args, this.args);
    } else {
        return expression(this.story,
            new OptionArgument2(this.story, this.parent, this.operator, args));
    }
};

function OptionArgument2(story, parent, operator, args) {
    this.story = story;
    this.parent = parent;
    this.operator = operator;
    this.args = args;
    Object.seal(this);
}

OptionArgument2.prototype.return = function _return(args) {
    return this.parent.return(this.operator, args, this.args);
};

function Option(story, path, parent, ends, jumps, leader, consequences) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends; // to tie off to the next option
    this.jumps = jumps; // to tie off to the next node after the next prompt
    this.node = null;
    this.leader = leader;
    this.consequences = consequences;
    this.order = 0;
    this.variable = null;
    this.next = null;
    this.mode = '';
    this.branch = null;
    Object.seal(this);
}

Option.prototype.return = function _return(path, ends, jumps, scanner) {
    // Create a jump from the end of the answer.
    if (this.mode !== 'a') {
        // If the answer is reused in the question, create a dedicated jump and
        // add it to the end of the answer.
        var jump = this.story.create(path, 'goto', null);
        this.node.answer.push(Path.toName(path));
        path = Path.next(path);
        ends = [jump];
    }

    return this.parent.return(
        Path.next(this.path),
        this.ends.concat([this.node]),
        this.jumps.concat(ends, jumps),
        scanner
    );
};

Option.prototype.thread = function thread(parent) {
    // Creat a dummy node, to replace if necessary, for arcs that begin with a
    // goto/divert arrow that otherwise would have loose ends to forward.
    var placeholder = this.story.create(this.next, 'goto', null);
    return new Thread(this.story, this.next, parent, [placeholder], []);
};

Option.prototype.push = function push(path, mode) {
    var start = Path.toName(this.next);
    var end = Path.toName(path);
    if (start !== end) {
        if (mode === 'q' || mode === 'qa') {
            this.node.question.push(start);
        }
        if (mode === 'a' || mode === 'qa') {
            this.node.answer.push(start);
        }
        this.next = path;
        this.mode = mode;
    }
};

// An option thread captures the end of an arc, and if the path has advanced,
// adds that arc to the option's questions and/or answer depending on the
// "mode" ("q", "a", or "qa") and proceeds to the following state.
function OptionThread(story, path, parent, ends, option, mode, Next) {
    this.type = 'option-thread';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    this.mode = mode;
    this.Next = Next;
    Object.seal(this);
}

OptionThread.prototype.return = function _return(path, ends, jumps) {
    this.option.push(path, this.mode);
    return new this.Next(this.story, path, this.parent, ends, this.option);
};

// Every option begins with a (potentially empty) thread before the first open
// backet that will contribute both to the question and the answer.
function AfterInitialQA(story, path, parent, ends, option) {
    this.type = 'after-first-qa';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.seal(this);
}

AfterInitialQA.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'token' && text === '[') {
        return this.option.thread(new AfterQorA(this.story, this.path, this, this.ends, this.option));
    } else {
        this.story.error('Expected brackets in option at ' + scanner.position());
        return this.return(this.path, this.ends, this.jumps);
    }
};

// The thread returns to this level after capturing the bracketed terms, after
// which anything and everything to the end of the block contributes to the
// answer.
AfterInitialQA.prototype.return = function _return(path, ends, jumps, scanner) {
    ends = [];

    // Thread consequences, including incrementing the option variable name
    var consequences = this.option.consequences;
    if (consequences.length) {
        this.option.node.answer.push(Path.toName(path));
    }
    for (var i = 0; i < consequences.length; i++) {
        var consequence = consequences[i];
        var node = this.story.create(path, 'mov');
        node.source = consequence[1];
        node.target = consequence[0];
        tie(ends, path);
        path = Path.next(path);
        ends = [node];
    }

    this.option.next = path;
    return this.option.thread(
        new OptionThread(this.story, path, this.parent, ends, this.option, 'a', AfterFinalA));
};

// After capturing the first arc within brackets, which may either contribute
// to the question or the answer, we decide which based on whether there is a
// following bracket.
function DecideQorA(story, path, parent, ends, option) {
    this.type = 'q-or-a';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.seal(this);
}

DecideQorA.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token' && text === '[') { // A
        this.option.push(this.path, 'a');
        return this.option.thread(
            new OptionThread(this.story, this.path, this, this.ends, this.option, 'q', ExpectFinalBracket));
    // istanbul ignore else
    } else if (type === 'token' && text === ']') { // Q
        this.option.push(this.path, 'q');
        return this.parent.return(this.path, this.ends, [], scanner);
    } else {
        this.story.error('Expected a bracket, either [ or ], at ' + scanner.position());
        return this.parent.return(this.path, this.ends, [], scanner);
    }
};

// If the brackets contain a sequence of question thread like [A [Q] QA [Q]
// QA...], then after each [question], we return here for continuing QA arcs.
DecideQorA.prototype.return = function _return(path, ends, jumps, scanner) {
    return this.option.thread(
        new OptionThread(this.story, path, this.parent, ends, this.option, 'qa', AfterQA));
};

// After a Question/Answer thread, there can always be another [Q] thread
// ad nauseam. Here we check whether this is the end of the bracketed
// expression or continue after a [Question].
function AfterQA(story, path, parent, ends, option) {
    this.type = 'after-qa';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.seal(this);
}

AfterQA.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token' && text === '[') {
        return this.option.thread(
            new OptionThread(this.story, this.path, this, this.ends, this.option, 'q', ExpectFinalBracket));
    // istanbul ignore else
    } else  if (type === 'token' && text === ']') {
        return this.parent.return(this.path, this.ends, [], scanner);
    } else {
        this.story.error('Expected either [ or ] bracket at ' + scanner.position());
        return this.parent.return(this.path, this.ends, [], scanner);
    }
};

AfterQA.prototype.return = function _return(path, ends, jumps, scanner) {
    return this.option.thread(
        new OptionThread(this.story, this.path, this.parent, ends, this.option, 'qa', ExpectFinalBracket));
};

// The bracketed terms may either take the form [Q] or [A, ([Q] QA)*].
// This captures the first arc without committing to either Q or A until we
// know whether it is followed by a bracketed term.
function AfterQorA(story, path, parent, ends, option) {
    this.type = 'after-q-or-a';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.seal(this);
}

// Just capture the path and proceed.
AfterQorA.prototype.return = function _return(path, ends, jumps, scanner) {
    return new DecideQorA(this.story, path, this.parent, ends, this.option);
};

// After a [Q] or [A [Q] QA...] block, there must be a closing bracket and we
// return to the parent arc of the option.
function ExpectFinalBracket(story, path, parent, ends, option) {
    this.type = 'after-q-or-a';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.seal(this);
}

ExpectFinalBracket.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'token' && text === ']') {
        return this.parent.return(this.path, this.ends, [], scanner);
    } else {
        this.story.error('Expected close bracket in option at ' + scanner.position());
        return this.parent.return(this.path, this.ends, [], scanner);
    }
};

// After the closing bracket in an option], everything that remains is the last
// node of the answer. After that thread has been submitted, we expect the
// block to end.
function AfterFinalA(story, path, parent, ends, option) {
    this.type = 'after-final-a';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.seal(this);
}

AfterFinalA.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore if
    if (type !== 'stop') {
        this.story.error('Expected end of block at end of option at ' + scanner.position());
    }
    return this.parent.return(this.path, this.ends, [], scanner);
};

// This concludes the portion dedicated to parsing options

function Branch(node) {
    this.type = 'branch';
    this.node = node;
    Object.seal(this);
}

Branch.prototype.tie = function tie(path) {
    this.node.branch = path;
};

function Rejoin(parent, branch) {
    this.parent = parent;
    this.branch = branch;
}

Rejoin.prototype.return = function _return(path, ends, jumps, scanner) {
    return this.parent.return(path, ends.concat([this.branch]), jumps, scanner);
};

function ExpectLabel(story, path, parent, ends) {
    this.type = 'label';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

ExpectLabel.prototype.return = function _return(expression, scanner) {
    // istanbul ignore else
    if (expression[0] === 'get') {
        return new MaybeProcedure(this.story, this.path, this.parent, this.ends, expression[1]);
    } else {
        this.story.error('Expected label after =, got ' + JSON.stringify(expression) + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function MaybeProcedure(story, path, parent, ends, label) {
    this.type = 'maybe-procedure';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.label = label;
}

MaybeProcedure.prototype.next = function next(type, space, text, scanner) {
    if (type === 'symbol' && text === '(') {
        return new Procedure(this.story, this.path, this, this.label);
    } else {
        var path = [this.label, 0];
        // place-holder goto thunk
        var label = this.story.create(path, 'goto', null);
        tie(this.ends, path);
        // ends also forwarded so they can be tied off if the goto is replaced.
        return new Thread(this.story, path, this.parent, this.ends.concat([label]), [])
            .next(type, space, text, scanner);
    }
};

MaybeProcedure.prototype.return = function _return(path, ends, jumps, scanner) {
    // After a procedure, connect prior ends.
    return this.parent.return(path, this.ends.concat(ends), jumps, scanner);
};

function Procedure(story, path, parent, label) {
    this.type = 'procedure';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.label = label;
    this.locals = [];
}

Procedure.prototype.next = function next(type, space, text, scanner) {
    if (type === 'symbol' && text === ')') {
        var path = [this.label, 0];
        var label = this.story.create(path, 'goto', null);

        // Leave the loose ends from before the procedure declaration for
        // after the procedure declaration is complete.

        // The procedure exists only for reference in calls.
        var sub = this.story.create(path, 'args', this.locals);

        return new Thread(this.story, Path.next(path), this, [label, sub], []);
    // istanbul ignore else
    } else if (type === 'alphanum') {
        // TODO handle expression.variable
        this.locals.push(text);
        return this;
    } else {
        this.story.error('Expected variable name or close paren, got ' + type + '/' + text + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this, [], []);
    }
};

Procedure.prototype.return = function _return(path, ends, jumps, scanner) {
    // Let loose ends of procedure dangle to null.
    // Pick up the threads left before the procedure declaration.
    return this.parent.return(Path.next(this.path), [], [], scanner);
};

function Goto(story, path, parent, ends) {
    this.type = 'goto';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

Goto.prototype.return = function _return(expression, scanner) {
    // istanbul ignore else
    if (expression[0] === 'get') {
        tieName(this.ends, expression[1]);
        return this.parent.return(Path.next(this.path), [], [], scanner);
    } else {
        this.story.error('Expected label after goto arrow, got expression ' + JSON.stringify(expression) + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function Call(story, path, parent, ends) {
    this.type = 'call';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    Object.seal(this);
}

Call.prototype.return = function _return(expression, scanner) {
    // istanbul ignore else
    if (expression[0] === 'get') {
        var label = expression[1];
        var node = this.story.create(this.path, 'call', label);
        var branch = new Branch(node);
        tie(this.ends, this.path);
        return new Thread(this.story, Path.firstChild(this.path), new EndCall(this.story, this.path, node, this.parent, label), [branch], []);
    } else {
        this.story.error('Expected label after call arrow, got expression ' + JSON.stringify(expression) + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function EndCall(story, path, node, parent, label) {
    this.story = story;
    this.path = path;
    this.node = node;
    this.parent = parent;
    this.label = label;
    Object.seal(this);
}

EndCall.prototype.return = function _return(path, ends, jumps, scanner) {
    tieName(ends, this.label);
    return new Expect('token', '}', this.story, Path.next(this.path), this.parent, [this.node], jumps);
};

function Block(story, path, parent, ends) {
    this.type = 'block';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

var comparators = {
    '>': true,
    '<': true,
    '>=': true,
    '<=': true,
    '==': true,
    '!=': true
};

var jumps = {
    '?': '!=', // to 0
    '!': '==' // to 0
};

var mutators = {
    '=': true,
    '+': true,
    '-': true,
    '*': true,
    '/': true,
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
    if (type === 'symbol' || type === 'alphanum' || type === 'token') {
        if (text === '(') {
            return expression(this.story, new ExpressionSwitch(this.story, this.path, this.parent, this.ends, '$'))
                .next(type, space, text, scanner);
        } else if (jumps[text]) {
            return expression(this.story, new Jump(this.story, this.path, this.parent, this.ends, jumps[text], ['val', 0]));
        } else if (comparators[text]) {
            return expression(this.story, new JumpCompare(this.story, this.path, this.parent, this.ends, text));
        } else if (mutators[text]) {
            return expression(this.story, new Set(this.story, this.path, this.parent, this.ends, text));
        } else if (variables[text]) {
            return expression(this.story, new ExpressionSwitch(this.story, this.path, this.parent, this.ends, variables[text]));
        } else if (text === ',') {
            return new Conjunction(this.story, this.path, this.parent, this.ends);
        } else if (switches[text]) {
            return new Switch(this.story, this.path, this.parent, this.ends)
                .start(null, null, null, switches[text])
                .case();
        } else if (text === '->') {
            return expression.variable(this.story, new Call(this.story, this.path, this.parent, this.ends));
        }
    }
    return new Switch(this.story, this.path, this.parent, this.ends)
        .start(null, Path.toName(this.path), 1, 'walk') // with variable and value, waiting for case to start
        .case() // first case
        .next(type, space, text, scanner);
};

function Conjunction(story, path, parent, ends) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.text = '';
    this.lift = '';
    this.drop = '';
    Object.seal(this);
}

Conjunction.prototype.next = function next(type, space, text, scanner) {
    if (type === 'symbol' || type === 'alphanum' || type === 'number') {
        return new ContinueConjunction(this.story, this.path, this.parent, this.ends, space, text);
    // istanbul ignore else
    } else if (type === 'token' && text === '}') {
        var delimit = this.story.create(this.path, 'delimit');
        tie(this.ends, this.path);
        return this.parent.return(Path.next(this.path), [delimit], [], scanner);
    } else {
        this.story.error('Expected conjunction text or delimiter in {,} block, got: ' + type + '/' + text + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function ContinueConjunction(story, path, parent, ends, lift, text) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.lift = lift;
    this.text = text;
    Object.seal(this);
}

ContinueConjunction.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore if
    if (type === 'symbol' || type === 'number') {
        this.text += space + text;
        return this;
    // istanbul ignore else
    } else if (text === '|') {
        var start = this.story.create(this.path, 'startJoin');
        start.text = this.text;
        start.lift = this.lift;
        start.drop = space;
        // TODO thread text lift drop of conjunction
        tie(this.ends, this.path);
        return new Thread(this.story, Path.next(this.path), this, [start], []);
    } else {
        this.story.error('Expected conjunction text or pipe |, got ' + type + '/' + text + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

ContinueConjunction.prototype.return = function _return(path, ends, jumps, scanner) {
    var stop = this.story.create(path, 'stopJoin');
    tie(ends, path);
    return new Expect('token', '}', this.story, Path.next(path), this.parent, [stop], jumps);
};

function JumpCompare(story, path, parent, ends, condition) {
    this.type = 'jump';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.condition = condition;
    Object.seal(this);
}

JumpCompare.prototype.return = function _return(right) {
    return expression(this.story, new Jump(this.story, this.path, this.parent, this.ends, this.condition, right));
};

function Jump(story, path, parent, ends, condition, right) {
    this.type = 'jump';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.condition = condition;
    this.right = right;
    Object.seal(this);
}

Jump.prototype.return = function _return(left) {
    return new MaybeConditional(this.story, this.path, this.parent, this.ends, [this.condition, left, this.right]);
};

function MaybeConditional(story, path, parent, ends, condition) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.condition = condition;
    Object.seal(this);
}

MaybeConditional.prototype.next = function next(type, space, text, scanner) {
    if (text === '|') {
        return new Switch(this.story, this.path, this.parent, this.ends)
            .start(expression.invert(this.condition), null, 0, 'walk', 2)
            .case();
    // istanbul ignore else
    } else if (text === '}') {
        var node = this.story.create(this.path, 'jump', this.condition);
        var branch = new Branch(node);
        tie(this.ends, this.path);
        return new Thread(this.story, Path.next(this.path), new Rejoin(this.parent, node), [branch], []);
    } else {
        this.story.error('Expected | or } after condition, got ' + type + '/' + text + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function Set(story, path, parent, ends, op) {
    this.type = 'set';
    this.op = op;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

Set.prototype.return = function _return(expression) {
    return new MaybeSetVariable(this.story, this.path, this.parent, this.ends, this.op, expression);
};

function MaybeSetVariable(story, path, parent, ends, op, expression) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.op = op;
    this.expression = expression;
}

MaybeSetVariable.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token' && text === '}') {
        return setVariable(this.story, this.path, this.parent, this.ends, this.op, ['val', 1], this.expression, scanner)
            .next(type, space, text, scanner);
    }
    return expression(this.story, new ExpectSetVariable(this.story, this.path, this.parent, this.ends, this.op, this.expression))
        .next(type, space, text, scanner);
};

function ExpectSetVariable(story, path, parent, ends, op, source) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.op = op;
    this.source = source;
}

ExpectSetVariable.prototype.return = function _return(target, scanner) {
    return setVariable(this.story, this.path, this.parent, this.ends, this.op, this.source, target, scanner);
};

function setVariable(story, path, parent, ends, op, source, target, scanner) {
    if (target[0] === 'get') {
        var variable = target[1];
        var node = story.create(path, 'set');
        if (op === '=') {
            node.expression = source;
        } else {
            node.expression = [op, target, source];
        }
        node.variable = variable;
        tie(ends, path);
        return new Expect('token', '}', story, Path.next(path), parent, [node], []);
    // istanbul ignore else
    } else if (target[0] === 'var') {
        var node = story.create(path, 'mov');
        if (op === '=') {
            node.source = source;
        } else {
            node.source = [op, target, source];
        }
        node.target = target;
        tie(ends, path);
        return new Expect('token', '}', story, Path.next(path), parent, [node], []);
    } else {
        this.story.error('Expected a variable to set, got expression ' + JSON.stringify(source) + ' ' + op + ' ' + JSON.stringify(target) + ' at ' + scanner.position());
        return new Thread(story, path, parent, ends, []);
    }
}

function ExpressionSwitch(story, path, parent, ends, mode) {
    this.type = 'expression-switch';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.mode = mode;
}

ExpressionSwitch.prototype.return = function _return(expression) {
    return new Variable(this.story, this.path, this.parent, this.ends, this.mode, expression);
};

function Variable(story, path, parent, ends, mode, expression) {
    this.type = 'variable';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.mode = mode;
    this.expression = expression;
    Object.seal(this);
}

Variable.prototype.next = function next(type, space, text, scanner) {
    if (text === '|') {
        return new Switch(this.story, this.path, this.parent, this.ends)
            .start(this.expression, null, 0, this.mode)
            .case();
    // istanbul ignore else
    } else if (text === '}') {
        var node = this.story.create(this.path, 'echo', this.expression);
        tie(this.ends, this.path);
        return new Thread(this.story, Path.next(this.path), this.parent, [node], []);
    } else {
        this.story.error('Expected | or } after expression in {$} block, got ' + type + '/' + text + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function Switch(story, path, parent, ends) {
    this.type = 'switch';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.branches = [];
}

Switch.prototype.start = function start(expression, variable, value, mode, min) {
    value = value || 0;
    if (mode === 'loop' && !expression) {
        value = 1;
    }
    expression = expression || ['get', Path.toName(this.path)];
    var node = this.story.create(this.path, 'switch', expression);
    node.variable = variable;
    node.value = value;
    node.mode = mode;
    tie(this.ends, this.path);
    node.branches = this.branches;
    return new Case(this.story, Path.firstChild(this.path), this, [], this.branches, min || 0);
};

Switch.prototype.return = function _return(path, ends, jumps, scanner) {
    return new Expect('token', '}', this.story, Path.next(this.path), this.parent, ends, jumps);
};

function Case(story, path, parent, ends, branches, min) {
    this.type = 'case';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.branches = branches;
    this.min = min;
    Object.seal(this);
}

Case.prototype.next = function next(type, space, text, scanner) {
    if (text === '|') {
        return this.case();
    } else {
        var path = this.path;
        while (this.branches.length < this.min) {
            var node = this.story.create(path, 'goto', null);
            this.ends.push(node);
            this.branches.push(Path.toName(path));
            path = Path.next(path);
        }
        return this.parent.return(path, this.ends, [], scanner)
            .next(type, space, text, scanner);
    }
};

Case.prototype.case = function _case() {
    var path = Path.zerothChild(this.path);
    var node = this.story.create(path, 'goto', null);
    this.branches.push(Path.toName(path));
    return new Thread(this.story, path, this, [node], []);
};

Case.prototype.return = function _return(path, ends, jumps, scanner) {
    return new Case(this.story, Path.next(this.path), this.parent, this.ends.concat(ends, jumps), this.branches, this.min);
};

function Program(story, path, parent, ends, jumps) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    Object.seal(this);
}

Program.prototype.next = function next(type, space, text, scanner) {
    if (type === 'stop') {
        return this.parent.return(this.path, this.ends, this.jumps, scanner)
            .next(type, space, text, scanner);
    } else if (type === 'break') {
        return this;
    // istanbul ignore if
    } else if (type === 'error') {
        // Break out of recursive error loops
        return this.parent.return(this.path, this.ends, this.jumps, scanner);
    } else {
        return expression.variable(this.story, new Assignment(this.story, this.path, this, this.ends, this.jumps))
            .next(type, space, text, scanner);
    }
};

Program.prototype.return = function _return(path, ends, jumps) {
    return new Program(this.story, path, this.parent, ends, jumps);
};

function Assignment(story, path, parent, ends, jumps) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    Object.seal(this);
}

Assignment.prototype.return = function _return(expression, scanner) {
    // istanbul ignore else
    if (expression[0] === 'get' || expression[0] === 'var') {
        return new ExpectOperator(this.story, this.path, this.parent, this.ends, this.jumps, expression);
    } else {
        this.story.error('Expected variable to assign, got: ' + JSON.stringify(expression) + ' at ' + scanner.position());
        return this.parent.return(this.path, this.ends, this.jumps)
            .next('error', '', '', scanner);
    }
};

function ExpectOperator(story, path, parent, ends, jumps, left) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    this.left = left;
    Object.seal(this);
}

ExpectOperator.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (text === '=') {
        return expression(this.story, new ExpectExpression(this.story, this.path, this.parent, this.ends, this.jumps, this.left, text));
    } else {
        this.story.error('Expected = operator, got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent.return(this.path, this.ends, this.jumps);
    }
};

function ExpectExpression(story, path, parent, ends, jumps, left, operator) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    this.left = left;
    this.operator = operator;
}

ExpectExpression.prototype.return = function _return(right, scanner) {
    var node;
    if (this.left[0] === 'get') {
        tie(this.ends, this.path);
        node = this.story.create(this.path, 'set', null);
        node.variable = this.left[1];
        node.expression = right;
    // istanbul ignore else
    } else if (this.left[0] === 'var') {
        tie(this.ends, this.path);
        node = this.story.create(this.path, 'mov', null);
        node.target = this.left;
        node.source = right;
    } else {
        this.story.error('Expected bindable expression, got: ' + JSON.stringify(expression) + ' at ' + scanner.position());
        return this.parent.return(Path.next(this.path), this.ends, this.jumps, scanner);
    }
    return this.parent.return(Path.next(this.path), [node], this.jumps, scanner);
};

function Expect(type, text, story, path, parent, ends, jumps) {
    this.type = 'expect';
    this.expect = type;
    this.text = text;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
}

Expect.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === this.expect && text === this.text) {
        return this.parent.return(this.path, this.ends, this.jumps, scanner);
    } else {
        this.story.error('Expected ' + this.expect + '/' + this.text + ', got ' + type + '/' + text + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, this.jumps);
    }
};

function MiniExpect(expect, text, story, parent) {
    this.type = 'mini-expect';
    this.expect = expect;
    this.text = text;
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

MiniExpect.prototype.return = function _return(path, ends, jumps, scanner) {
    return new ExpectNext(this.expect, this.text, this.story, path, this.parent, ends, jumps);
};

function ExpectNext(expect, text, story, path, parent, ends, jumps) {
    this.type = 'expect-next';
    this.expect = expect;
    this.text = text;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    Object.seal(this);
}

ExpectNext.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore if
    if (type !== this.expect || text !== this.text) {
        this.story.error('Expected ' + this.expect + '/' + this.text + ', got ' + type + '/' + text + ' at ' + scanner.position());
    }
    return this.parent.return(this.path, this.ends, this.jumps, scanner);
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
