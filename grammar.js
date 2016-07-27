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
    this.story = story;
    Object.freeze(this);
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
    Object.freeze(this);
}

// istanbul ignore next
End.prototype.next = function next(type, space, text, scanner) {
    return this;
};

// ends are tied to the next instruction
// jumps are tied off after the next encountered prompt
function Thread(story, path, parent, ends, jumps) {
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    this.story = story;
    Object.freeze(this);
}

Thread.prototype.next = function next(type, space, text, scanner) {
    if (type === 'symbol'|| type === 'alphanum' || type === 'number' || type === 'literal' || text === '--' || text === '---') {
        return new Text(this.story, this.path, space, text, this, this.ends);
    }  else if (type === 'token') {
        if (text === '{') {
            return new Block(this.story, this.path, this, this.ends);
        } else if (text === '@') {
            return expression.label(this.story, new Label(this.story, this.path, this, this.ends));
        } else if (text === '->') {
            return expression.label(this.story, new Goto(this.story, this.path, this, this.ends));
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
            return new MaybeOption(this.story, this.path, new ThenExpect('stop', '', this.story, this), this.ends, [], text);
        } else if (text === '-') {
            return new MaybeThread(this.story, this.path, new ThenExpect('stop', '', this.story, this), this.ends, [], []);
        } else if (text === '>') {
            var node = this.story.create(this.path, 'prompt');
            // tie off ends to the prompt.
            tie(this.ends, this.path);
            // promote jumps to ends, tying them off after the prompt.
            return new Thread(this.story, Path.next(this.path), new ThenExpect('stop', '', this.story, this), this.jumps, []);
        } else { // if text === '!') {
            return new Program(this.story, this.path, new ThenExpect('stop', '', this.story, this), this.ends, []);
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

function Text(story, path, lift, text, parent, ends) {
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

function MaybeThread(story, path, parent, ends, jumps, skips) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    this.skips = skips;
};

MaybeThread.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token') {
        if (text === '{') {
            return expression(this.story,
                new ThenExpect('token', '}', this.story,
                    new ThreadCondition(this.story, this.path, this.parent, this.ends, this.jumps, this.skips)));
        }
    }
    return new Thread(this.story, this.path, this, this.ends, this.jumps)
        .next(type, space, text, scanner);
};

MaybeThread.prototype.return = function _return(path, ends, jumps, scanner) {
    return this.parent.return(path, ends.concat(this.skips), jumps, scanner);
};

function ThreadCondition(story, path, parent, ends, jumps, skips) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    this.skips = skips;
    Object.freeze(this);
}

ThreadCondition.prototype.return = function _return(args) {
    var node = this.story.create(this.path, 'jump', expression.invert(args));
    var branch = new Branch(node);
    tie(this.ends, this.path);
    return new MaybeThread(this.story, Path.next(this.path), this.parent, [node], this.jumps, this.skips.concat([branch]));
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
                new ThenExpect('token', '}', this.story, this));
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
    Object.freeze(this);
}

OptionOperator.prototype.next = function next(type, space, text, scanner) {
    if (text === '+' || text === '-') {
        return expression(this.story,
            new OptionArgument(this.story, this.parent, text));
    // istanbul ignore else
    } else {
        return expression(this.story,
            new OptionArgument2(this.story, this.parent, '?'))
                .next(type, space, text, scanner);
    }
};

function OptionArgument(story, parent, operator) {
    this.story = story;
    this.parent = parent;
    this.operator = operator;
    Object.freeze(this);
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
    Object.freeze(this);
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
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    this.mode = mode;
    this.Next = Next;
    Object.freeze(this);
}

OptionThread.prototype.return = function _return(path, ends, jumps) {
    this.option.push(path, this.mode);
    return new this.Next(this.story, path, this.parent, ends, this.option);
};

// Every option begins with a (potentially empty) thread before the first open
// backet that will contribute both to the question and the answer.
function AfterInitialQA(story, path, parent, ends, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.freeze(this);
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
        var node = this.story.create(path, 'move');
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
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.freeze(this);
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
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.freeze(this);
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
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.freeze(this);
}

// Just capture the path and proceed.
AfterQorA.prototype.return = function _return(path, ends, jumps, scanner) {
    return new DecideQorA(this.story, path, this.parent, ends, this.option);
};

// After a [Q] or [A [Q] QA...] block, there must be a closing bracket and we
// return to the parent arc of the option.
function ExpectFinalBracket(story, path, parent, ends, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.option = option;
    Object.freeze(this);
}

ExpectFinalBracket.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore if
    if (type !== 'token' || text !== ']') {
        this.story.error('Expected close bracket in option at ' + scanner.position());
    }
    return this.parent.return(this.path, this.ends, [], scanner);
};

// After the closing bracket in an option], everything that remains is the last
// node of the answer. After that thread has been submitted, we expect the
// block to end.
function AfterFinalA(story, path, parent, ends, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    Object.freeze(this);
}

AfterFinalA.prototype.next = function next(type, space, text, scanner) {
    return this.parent.return(this.path, this.ends, [], scanner)
        .next(type, space, text, scanner);
};

// This concludes the portion dedicated to parsing options

function Branch(node) {
    this.node = node;
    Object.freeze(this);
}

Branch.prototype.tie = function tie(path) {
    this.node.branch = path;
};

function Label(story, path, parent, ends) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    Object.freeze(this);
}

Label.prototype.return = function _return(expression, scanner) {
    if (expression[0] === 'get') {
        var label = expression[1];
        var path = [label, 0];
        // place-holder goto thunk
        var node = this.story.create(path, 'goto', null);
        tie(this.ends, path);
        // ends also forwarded so they can be tied off if the goto is replaced.
        return this.parent.return(path, this.ends.concat([node]), [], scanner);
    // istanbul ignore else
    } else if (expression[0] === 'call') {
        var label = expression[1][1];
        var path = [label, 0];
        var node = this.story.create(path, 'args', null);
        var params = [];
        for (var i = 2; i < expression.length; i++) {
            var arg = expression[i];
            // istanbul ignore else
            if (arg[0] === 'get') {
                params.push(arg[1]);
            } else {
                this.story.error('Expected parameter name, not expression ' + JSON.stringify(arg) + ' at ' + scanner.position());
            }
        }
        node.locals = params;
        return new Thread(this.story, Path.next(path),
            new ConcludeProcedure(this.story, this.path, this.parent, this.ends),
            [node], []);
    } else {
        this.story.error('Expected label after @, got ' + JSON.stringify(expression) + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function ConcludeProcedure(story, path, parent, ends) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    Object.freeze(this);
};

ConcludeProcedure.prototype.return = function _return(path, ends, jumps, scanner) {
    // After a procedure, connect prior ends.
    // Leave loose end of procedure dangling.
    return this.parent.return(this.path, this.ends, [], scanner);
};

function Goto(story, path, parent, ends, jumps) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

Goto.prototype.return = function _return(args, scanner) {
    // istanbul ignore else
    if (args[0] === 'get') {
        tieName(this.ends, args[1]);
        return this.parent.return(Path.next(this.path), [], [], scanner);
    } else if (args[0] === 'call') {
        var label = args[1][1];
        var node = this.story.create(this.path, 'call', label);
        node.args = args.slice(2);
        tie(this.ends, this.path);
        return this.parent.return(Path.next(this.path), [node], [], scanner);
    } else {
        this.story.error('Expected label after goto arrow, got expression ' + JSON.stringify(args) + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function Block(story, path, parent, ends) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

var mutators = {
    '=': true,
    '+': true,
    '-': true,
    '*': true,
    '/': true,
};

var variables = {
    '@': 'loop',
    '#': 'hash',
    '^': 'pick'
};

var switches = {
    '&': 'loop',
    '~': 'rand'
};

Block.prototype.next = function next(type, space, text, scanner) {
    if (type === 'symbol' || type === 'alphanum' || type === 'token') {
        if (text === '(') {
            return expression(this.story, new ExpressionBlock(this.story, this.path, this.parent, this.ends, 'walk'))
                .next(type, space, text, scanner);
        } else if (mutators[text]) {
            return expression(this.story, new SetBlock(this.story, this.path, new ThenExpect('token', '}', this.story, this.parent), this.ends, text));
        } else if (variables[text]) {
            return expression(this.story, new ExpressionBlock(this.story, this.path, this.parent, this.ends, variables[text]));
        } else if (text === '!') {
            return new Program(this.story, this.path, new ThenExpect('token', '}', this.story, this.parent), this.ends, []);
        } else if (switches[text]) {
            return new SwitchBlock(this.story, this.path, this.parent, this.ends)
                .start(null, Path.toName(this.path), null, switches[text]);
        }
    }
    return new SwitchBlock(this.story, this.path, this.parent, this.ends)
        .start(null, Path.toName(this.path), 1, 'walk') // with variable and value, waiting for case to start
        .next(type, space, text, scanner);
};

function SetBlock(story, path, parent, ends, op) {
    this.op = op;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

SetBlock.prototype.return = function _return(expression) {
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
        return this.set(['val', 1], this.expression, scanner)
            .next(type, space, text, scanner);
    }
    return expression(this.story, new ExpectSetVariable(this))
        .next(type, space, text, scanner);
};

MaybeSetVariable.prototype.set = function set(source, target, scanner) {
    var node = this.story.create(this.path, 'move');
    if (this.op === '=') {
        node.source = source;
    } else {
        node.source = [this.op, target, source];
    }
    node.target = target;
    tie(this.ends, this.path);
    return this.parent.return(Path.next(this.path), [node], [], scanner);
};

function ExpectSetVariable(parent) {
    this.parent = parent;
}

ExpectSetVariable.prototype.return = function _return(target, scanner) {
    return this.parent.set(this.parent.expression, target, scanner);
};

function ExpressionBlock(story, path, parent, ends, mode) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.mode = mode;
}

ExpressionBlock.prototype.return = function _return(expression) {
    return new AfterExpressionBlock(this.story, this.path, this.parent, this.ends, this.mode, expression);
};

function AfterExpressionBlock(story, path, parent, ends, mode, expression) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.mode = mode;
    this.expression = expression;
    Object.freeze(this);
}

AfterExpressionBlock.prototype.next = function next(type, space, text, scanner) {
    if (text === '|') {
        return new SwitchBlock(this.story, this.path, this.parent, this.ends)
            .start(this.expression, null, 0, this.mode);
    } else if (text === '?') {
        return new SwitchBlock(this.story, this.path, this.parent, this.ends)
            .start(expression.invert(this.expression), null, 0, this.mode, 2);
    // istanbul ignore else
    } else if (text === '}') {
        var node = this.story.create(this.path, 'echo', this.expression);
        tie(this.ends, this.path);
        return new Thread(this.story, Path.next(this.path), this.parent, [node], []);
    } else {
        this.story.error('Expected | or } after expression, got ' + type + '/' + text + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.ends, []);
    }
};

function SwitchBlock(story, path, parent, ends) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.node = null;
    this.branches = [];
    this.weights = [];
}

SwitchBlock.prototype.start = function start(expression, variable, value, mode, min) {
    value = value || 0;
    if (mode === 'loop' && !expression) {
        value = 1;
    }
    expression = expression || ['get', Path.toName(this.path)];
    var node = this.story.create(this.path, 'switch', expression);
    this.node = node;
    node.variable = variable;
    node.value = value;
    node.mode = mode;
    tie(this.ends, this.path);
    node.branches = this.branches;
    node.weights = this.weights;
    return new MaybeWeightedCase(this.story, new Case(this.story, Path.firstChild(this.path), this, [], this.branches, min || 0));
};

SwitchBlock.prototype.return = function _return(path, ends, jumps, scanner) {
    if (this.node.mode === 'pick') {
        ends = [this.node];
        // TODO think about what to do with jumps.
    }
    return new Expect('token', '}', this.story, Path.next(this.path), this.parent, ends, jumps);
};

function Case(story, path, parent, ends, branches, min) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.branches = branches;
    this.min = min;
    Object.freeze(this);
}

Case.prototype.next = function next(type, space, text, scanner) {
    if (text === '|') {
        return new MaybeWeightedCase(this.story, this);
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

Case.prototype.case = function _case(args) {
    this.parent.weights.push(args || ['val', 1]);
    var path = Path.zerothChild(this.path);
    var node = this.story.create(path, 'goto', null);
    this.branches.push(Path.toName(path));
    return new Thread(this.story, path, this, [node], []);
};

Case.prototype.return = function _return(path, ends, jumps, scanner) {
    return new Case(this.story, Path.next(this.path), this.parent, this.ends.concat(ends, jumps), this.branches, this.min);
};

function MaybeWeightedCase(story, parent) {
    this.story = story;
    this.parent = parent;
}

MaybeWeightedCase.prototype.next = function next(type, space, text, scanner) {
    if (text === '(') {
        return expression(this.story, this)
            .next(type, space, text, scanner);
    } else {
        return this.parent.case()
            .next(type, space, text, scanner);
    }
};

MaybeWeightedCase.prototype.return = function _return(args) {
    return this.parent.case(args);
};

function Program(story, path, parent, ends, jumps) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    Object.freeze(this);
}

Program.prototype.next = function next(type, space, text, scanner) {
    if (type === 'stop' || text === '}') {
        return this.parent.return(this.path, this.ends, this.jumps, scanner)
            .next(type, space, text, scanner);
    } else if (text === ',' || type === 'break') {
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
    Object.freeze(this);
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
    Object.freeze(this);
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
    // TODO validate this.left as a valid move target
    tie(this.ends, this.path);
    node = this.story.create(this.path, 'move', null);
    node.target = this.left;
    node.source = right;
    return this.parent.return(Path.next(this.path), [node], this.jumps, scanner);
};

function ThenExpect(expect, text, story, parent) {
    this.expect = expect;
    this.text = text;
    this.story = story;
    this.parent = parent;
    Object.freeze(this);
}

ThenExpect.prototype.return = function _return(path, ends, jumps, scanner) {
    return new Expect(this.expect, this.text, this.story, path, this.parent, ends, jumps);
};

function Expect(expect, text, story, path, parent, ends, jumps) {
    this.expect = expect;
    this.text = text;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.jumps = jumps;
    Object.freeze(this);
}

Expect.prototype.next = function next(type, space, text, scanner) {
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
