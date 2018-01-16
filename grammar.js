'use strict';

var Path = require('./path');
var story = require('./story');
var expression = require('./expression');

exports.start = start;

function start(story) {
    var path = Path.start();
    var stop = new Stop(story);
    var start = story.create(path, 'goto', 'RET', '1:1');
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

Stop.prototype.return = function _return(path, rets, escs, scanner) {
    tie(rets, 'RET');
    tie(escs, 'ESC');
    return this;
};

function End() {
    Object.freeze(this);
}

// istanbul ignore next
End.prototype.next = function next(type, space, text, scanner) {
    return this;
};

// rets are tied to the next instruction
// escs are tied off after the next encountered prompt
function Thread(story, path, parent, rets, escs) {
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.story = story;
    Object.freeze(this);
}

Thread.prototype.next = function next(type, space, text, scanner) {
    if (type === 'symbol'|| type === 'alphanum' || type === 'number' || type === 'literal' || text === '--' || text === '---') {
        return new Text(this.story, this.path, space, text, this, this.rets);
    }  else if (type === 'token') {
        if (text === '{') {
            return new Block(this.story, this.path, new ThenExpect('token', '}', this.story, this), this.rets);
        } else if (text === '@') {
            return expression.label(this.story, new Label(this.story, this.path, this, this.rets));
        } else if (text === '->') {
            return expression.label(this.story, new Goto(this.story, this.path, this, this.rets));
        } else if (text === '<-') {
            // Explicitly tie rets to null by dropping them.
            tie(this.rets, 'RET');
            // Continue carrying escs to the next encountered prompt.
            // Advance the path so that option thread don't appear empty.
            return new Thread(this.story, Path.next(this.path), this.parent, [], this.escs);
        } else if (text === '/') {
            var node = this.story.create(this.path, 'break', scanner.position());
            tiePath(this.rets, this.path);
            return new Thread(this.story, Path.next(this.path), this.parent, [node], this.escs);
        } else if (text === '//') {
            var node = this.story.create(this.path, 'paragraph', null, scanner.position());
            tiePath(this.rets, this.path);
            return new Thread(this.story, Path.next(this.path), this.parent, [node], this.escs);
        } else if (text === '{"' || text === '{\'' || text === '"}' || text === '\'}') {
            return new Text(this.story, this.path, space, '', this, this.rets)
                .next(type, '', text, scanner);
        }
    } else if (type === 'start') {
        if (text === '+' || text === '*') {
            return new MaybeOption(this.story, this.path, new ThenExpect('stop', '', this.story, this), this.rets, [], text);
        } else if (text === '-') {
            return new MaybeThread(this.story, this.path, new ThenExpect('stop', '', this.story, this), this.rets, [], [], ' ');
        } else if (text === '>') {
            var node = this.story.create(this.path, 'ask', null, scanner.position());
            // tie off rets to the prompt.
            tiePath(this.rets, this.path);
            // promote escs to rets, tying them off after the prompt.
            var escs = this.escs.slice();
            this.escs.length = 0;
            return new Thread(this.story, Path.next(this.path), new ThenExpect('stop', '', this.story, this), escs, []);
        } else { // if text === '!') {
            return new Program(this.story, this.path, new ThenExpect('stop', '', this.story, this), this.rets, []);
        }
    } else if (type === 'dash') {
        var node = this.story.create(this.path, 'rule', scanner.position());
        tiePath(this.rets, this.path);
        return new Thread(this.story, Path.next(this.path), this.parent, [node], this.escs);
    } else if (type === 'break') {
        return this;
    }
    if (type === 'stop' || text === '|' || text === ']' || text === '[' || text === '}') {
        return this.parent.return(this.path, this.rets, this.escs, scanner)
            .next(type, space, text, scanner);
    }
    return new Text(this.story, this.path, space, text, this, this.rets);
};

Thread.prototype.return = function _return(path, rets, escs, scanner) {
    // All rules above (in next) guarantee that this.rets has been passed to
    // any rule that might use them. If the rule fails to use them, they must
    // return them. However, escs are never passed to any rule that returns.
    return new Thread(this.story, path, this.parent, rets, this.escs.concat(escs));
};

function Text(story, path, lift, text, parent, rets) {
    this.story = story;
    this.path = path;
    this.lift = lift;
    this.text = text;
    this.parent = parent;
    this.rets = rets;
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
    tiePath(this.rets, this.path);
    var node = this.story.create(this.path, 'text', this.text, scanner.position());
    node.lift = this.lift;
    node.drop = space;
    return this.parent.return(Path.next(this.path), [node], [], scanner)
        .next(type, space, text, scanner);
};

function MaybeThread(story, path, parent, rets, escs, skips, space) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.skips = skips;
    this.space = space || '';
};

MaybeThread.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token') {
        if (text === '{') {
            return expression(this.story,
                new ThenExpect('token', '}', this.story,
                    new ThreadCondition(this.story, this.path, this.parent, this.rets, this.escs, this.skips)));
        }
    }
    return new Thread(this.story, this.path, this, this.rets, this.escs)
        .next(type, this.space || space, text, scanner);
};

MaybeThread.prototype.return = function _return(path, rets, escs, scanner) {
    return this.parent.return(path, rets.concat(this.skips), escs, scanner);
};

function ThreadCondition(story, path, parent, rets, escs, skips) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.skips = skips;
    Object.freeze(this);
}

ThreadCondition.prototype.return = function _return(args, scanner) {
    var node = this.story.create(this.path, 'jump', expression.invert(args), scanner.position());
    var branch = new Branch(node);
    tiePath(this.rets, this.path);
    return new MaybeThread(this.story, Path.next(this.path), this.parent, [node], this.escs, this.skips.concat([branch]));
};

function MaybeOption(story, path, parent, rets, escs, leader) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.leader = leader;
    this.conditions = [];
    this.consequences = [];
    this.keywords = {};
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
        if (text === '<>') {
            return this.return('keyword', '', null, scanner);
        }
        if (text === '<') {
            return new Keyword(this);
        }
    }
    return this.option(scanner).next(type, space, text, scanner);
};

MaybeOption.prototype.return = function _return(operator, expression, modifier, scanner) {
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
    if (operator === 'keyword') {
        this.keywords[expression] = true;
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

MaybeOption.prototype.option = function option(scanner) {
    var variable = Path.toName(this.path);
    var rets = [];

    tiePath(this.rets, this.at);

    if (this.leader === '*') {
        this.consequences.push([['get', variable], ['+', ['get', variable], ['val', 1]]]);
        var jump = this.story.create(this.at, 'jump', ['<>', ['get', variable], ['val', 0]], scanner.position());
        var jumpBranch = new Branch(jump);
        rets.push(jumpBranch);
        this.advance();
        tiePath([jump], this.at);
    }

    for (var i = 0; i < this.conditions.length; i++) {
        var condition = this.conditions[i];
        var jump = this.story.create(this.at, 'jump', ['==', condition, ['val', 0]], scanner.position());
        var jumpBranch = new Branch(jump);
        rets.push(jumpBranch);
        this.advance();
        tiePath([jump], this.at);
    }

    var option = new Option(this.story, this.path, this.parent, rets, this.escs, this.leader, this.consequences);
    option.node = this.story.create(this.at, 'option', null, scanner.position());
    option.node.keywords = Object.keys(this.keywords).sort();
    this.advance();

    option.next = this.at;
    return option.thread(scanner,
        new OptionThread(this.story, this.at, option, [], option, 'qa', AfterInitialQA));
};

// Captures <keyword> annotations on options.
function Keyword(parent) {
    this.parent = parent;
    this.keyword = '';
    this.space = '';
}

Keyword.prototype.next = function next(type, space, text, scanner) {
    if (text === '>') {
        return this.parent.return('keyword', this.keyword, null, scanner);
    }
    this.keyword += (this.space && space) + text;
    this.space = ' ';
    return this;
};

// {+x}, {-x}, or {(x)}
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
        return this.parent.return(this.operator, args, this.args, scanner);
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

OptionArgument2.prototype.return = function _return(args, scanner) {
    return this.parent.return(this.operator, args, this.args, scanner);
};

function Option(story, path, parent, rets, escs, leader, consequences) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets; // to tie off to the next option
    this.escs = escs; // to tie off to the next node after the next prompt
    this.node = null;
    this.leader = leader;
    this.consequences = consequences;
    this.next = null;
    this.mode = '';
    this.branch = null;
    Object.seal(this);
}

Option.prototype.return = function _return(path, rets, escs, scanner) {
    // Create a jump from the end of the answer.
    if (this.mode !== 'a') {
        // If the answer is reused in the question, create a dedicated jump and
        // add it to the end of the answer.
        var jump = this.story.create(path, 'goto', 'RET', scanner.position());
        this.node.answer.push(Path.toName(path));
        path = Path.next(path);
        rets.push(jump);
    }

    return this.parent.return(
        Path.next(this.path),
        this.rets.concat([this.node]),
        this.escs.concat(rets, escs),
        scanner
    );
};

Option.prototype.thread = function thread(scanner, parent) {
    // Creat a dummy node, to replace if necessary, for arcs that begin with a
    // goto/divert arrow that otherwise would have loose rets to forward.
    var placeholder = this.story.create(this.next, 'goto', 'RET', scanner.position());
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
function OptionThread(story, path, parent, rets, option, mode, Next) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    this.mode = mode;
    this.Next = Next;
    Object.freeze(this);
}

OptionThread.prototype.return = function _return(path, rets, escs, scanner) {
    this.option.push(path, this.mode);
    // TODO investigate whether we can consistently tie of received rets
    // instead of passing them forward to OptionThread, which consistently
    // just terminates them on their behalf.
    tie(this.rets, 'RET');
    // TODO no test exercises this kind of jump.
    tie(escs, 'ESC');
    return new this.Next(this.story, path, this.parent, rets, this.option);
};

// Every option begins with a (potentially empty) thread before the first open
// backet that will contribute both to the question and the answer.
function AfterInitialQA(story, path, parent, rets, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
}

AfterInitialQA.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'token' && text === '[') {
        return this.option.thread(scanner, new AfterQorA(this.story, this.path, this, this.rets, this.option));
    } else {
        this.story.error('Expected brackets in option at ' + scanner.position());
        return this.return(this.path, this.rets, this.escs, scanner);
    }
};

// The thread returns to this level after capturing the bracketed terms, after
// which anything and everything to the end of the block contributes to the
// answer.
AfterInitialQA.prototype.return = function _return(path, rets, escs, scanner) {
    tie(rets, 'RET');
    // TODO no test exercises these escs.
    tie(escs, 'ESC');

    rets = [];

    // Thread consequences, including incrementing the option variable name
    var consequences = this.option.consequences;
    if (consequences.length) {
        this.option.node.answer.push(Path.toName(path));
    }
    for (var i = 0; i < consequences.length; i++) {
        var consequence = consequences[i];
        var node = this.story.create(path, 'move', null, scanner.position());
        node.source = consequence[1];
        node.target = consequence[0];
        tiePath(rets, path);
        path = Path.next(path);
        rets = [node];
    }

    this.option.next = path;
    return this.option.thread(scanner,
        new OptionThread(this.story, path, this.parent, rets, this.option, 'a', AfterFinalA));
};

// After capturing the first arc within brackets, which may either contribute
// to the question or the answer, we decide which based on whether there is a
// following bracket.
function DecideQorA(story, path, parent, rets, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
}

DecideQorA.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token' && text === '[') { // A
        this.option.push(this.path, 'a');
        return this.option.thread(scanner,
            new OptionThread(this.story, this.path, this, this.rets, this.option, 'q', ExpectFinalBracket));
    // istanbul ignore else
    } else if (type === 'token' && text === ']') { // Q
        this.option.push(this.path, 'q');
        return this.parent.return(this.path, this.rets, [], scanner);
    } else {
        this.story.error('Expected a bracket, either [ or ], at ' + scanner.position());
        return this.parent.return(this.path, this.rets, [], scanner);
    }
};

// If the brackets contain a sequence of question thread like [A [Q] QA [Q]
// QA...], then after each [question], we return here for continuing QA arcs.
DecideQorA.prototype.return = function _return(path, rets, escs, scanner) {
    // TODO no test exercises these escs.
    tie(escs, 'ESC');
    return this.option.thread(scanner,
        new OptionThread(this.story, path, this.parent, rets, this.option, 'qa', AfterQA));
};

// After a Question/Answer thread, there can always be another [Q] thread
// ad nauseam. Here we check whether this is the end of the bracketed
// expression or continue after a [Question].
function AfterQA(story, path, parent, rets, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
}

AfterQA.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token' && text === '[') {
        return this.option.thread(scanner,
            new OptionThread(this.story, this.path, this, this.rets, this.option, 'q', ExpectFinalBracket));
    // istanbul ignore else
    } else  if (type === 'token' && text === ']') {
        return this.parent.return(this.path, this.rets, [], scanner);
    } else {
        this.story.error('Expected either [ or ] bracket at ' + scanner.position());
        return this.parent.return(this.path, this.rets, [], scanner);
    }
};

AfterQA.prototype.return = function _return(path, rets, escs, scanner) {
    // TODO no test exercises these escapes.
    tie(escs, 'ESC');
    return this.option.thread(scanner,
        new OptionThread(this.story, this.path, this.parent, rets, this.option, 'qa', ExpectFinalBracket));
};

// The bracketed terms may either take the form [Q] or [A, ([Q] QA)*].
// This captures the first arc without committing to either Q or A until we
// know whether it is followed by a bracketed term.
function AfterQorA(story, path, parent, rets, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
}

// Just capture the path and proceed.
AfterQorA.prototype.return = function _return(path, rets, escs, scanner) {
    // TODO consider whether this could have been done earlier.
    tie(this.rets, 'RET');
    // TODO no test exercises these escapes.
    tie(escs, 'ESC');
    return new DecideQorA(this.story, path, this.parent, rets, this.option);
};

// After a [Q] or [A [Q] QA...] block, there must be a closing bracket and we
// return to the parent arc of the option.
function ExpectFinalBracket(story, path, parent, rets, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
}

ExpectFinalBracket.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore if
    if (type !== 'token' || text !== ']') {
        this.story.error('Expected close bracket in option at ' + scanner.position());
    }
    return this.parent.return(this.path, this.rets, [], scanner);
};

// After the closing bracket in an option], everything that remains is the last
// node of the answer. After that thread has been submitted, we expect the
// block to end.
function AfterFinalA(story, path, parent, rets, option) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    Object.freeze(this);
}

AfterFinalA.prototype.next = function next(type, space, text, scanner) {
    return this.parent.return(this.path, this.rets, [], scanner)
        .next(type, space, text, scanner);
};

// This concludes the portion dedicated to parsing options

// Branch is a fake story node. It serves to mark that the wrapped node's
// "branch" label should be tied instead of its "next" label.
function Branch(node) {
    this.type = 'branch';
    this.node = node;
    Object.freeze(this);
}

function Label(story, path, parent, rets) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    Object.freeze(this);
}

Label.prototype.return = function _return(expression, scanner) {
    if (expression[0] === 'get') {
        var label = expression[1];
        var path = [label, 0];
        // place-holder goto thunk
        var node = this.story.create(path, 'goto', 'RET', scanner.position());
        tiePath(this.rets, path);
        // rets also forwarded so they can be tied off if the goto is replaced.
        return this.parent.return(path, this.rets.concat([node]), [], scanner);
    // istanbul ignore else
    } else if (expression[0] === 'call') {
        var label = expression[1][1];
        var path = [label, 0];
        var node = this.story.create(path, 'def', null, scanner.position());
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
            new ConcludeProcedure(this.story, this.path, this.parent, this.rets),
            [node], []);
    } else {
        this.story.error('Expected label after @, got ' + JSON.stringify(expression) + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.rets, []);
    }
};

function ConcludeProcedure(story, path, parent, rets) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    Object.freeze(this);
};

ConcludeProcedure.prototype.return = function _return(path, rets, escs, scanner) {
    // After a procedure, connect prior rets.
    tie(rets, 'RET');
    // Dangling escs go to an escape instruction, to follow the jump path in
    // the parent scope, determined at run time.
    tie(escs, 'ESC');
    return this.parent.return(this.path, this.rets, [], scanner);
};

function Goto(story, path, parent, rets, escs) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
}

Goto.prototype.return = function _return(args, scanner) {
    // istanbul ignore else
    if (args[0] === 'get') {
        tie(this.rets, args[1]);
        return this.parent.return(Path.next(this.path), [], [], scanner);
    } else if (args[0] === 'call') {
        var label = args[1][1];
        var node = this.story.create(this.path, 'call', label, scanner.position());
        node.args = args.slice(2);
        tiePath(this.rets, this.path);
        return this.parent.return(Path.next(this.path), [node], [new Branch(node)], scanner);
    } else {
        this.story.error('Expected label after goto arrow, got expression ' + JSON.stringify(args) + ' at ' + scanner.position());
        return new Thread(this.story, this.path, this.parent, this.rets, []);
    }
};

function Block(story, path, parent, rets) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
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
            return expression(this.story, new ExpressionBlock(this.story, this.path, this.parent, this.rets, 'walk'))
                .next(type, space, text, scanner);
        } else if (mutators[text]) {
            return expression(this.story, new SetBlock(this.story, this.path, this.parent, this.rets, text));
        } else if (variables[text]) {
            return expression(this.story, new ExpressionBlock(this.story, this.path, this.parent, this.rets, variables[text]));
        } else if (text === '!') {
            return new Program(this.story, this.path, this.parent, this.rets, []);
        } else if (switches[text]) {
            return new SwitchBlock(this.story, this.path, this.parent, this.rets)
                .start(scanner, null, Path.toName(this.path), null, switches[text]);
        }
    }
    return new SwitchBlock(this.story, this.path, this.parent, this.rets)
        .start(scanner, null, Path.toName(this.path), 1, 'walk') // with variable and value, waiting for case to start
        .next(type, space, text, scanner);
};

function SetBlock(story, path, parent, rets, op) {
    this.op = op;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
}

SetBlock.prototype.return = function _return(expression, scanner) {
    return new MaybeSetVariable(this.story, this.path, this.parent, this.rets, this.op, expression);
};

function MaybeSetVariable(story, path, parent, rets, op, expression) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.op = op;
    this.expression = expression;
}

MaybeSetVariable.prototype.next = function next(type, space, text, scanner) {
    if (type === 'token' && text === '}') {
        return this.set(['val', 1], this.expression, scanner)
            .next(type, space, text, scanner);
    }
    return expression(this.story, this)
        .next(type, space, text, scanner);
};

MaybeSetVariable.prototype.set = function set(source, target, scanner) {
    var node = this.story.create(this.path, 'move', null, scanner.position());
    if (this.op === '=') {
        node.source = source;
    } else {
        node.source = [this.op, target, source];
    }
    node.target = target;
    tiePath(this.rets, this.path);
    return this.parent.return(Path.next(this.path), [node], [], scanner);
};

MaybeSetVariable.prototype.return = function _return(target, scanner) {
    return this.set(this.expression, target, scanner);
};

function ExpressionBlock(story, path, parent, rets, mode) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.mode = mode;
}

ExpressionBlock.prototype.return = function _return(expression, scanner) {
    return new AfterExpressionBlock(this.story, this.path, this.parent, this.rets, this.mode, expression);
};

function AfterExpressionBlock(story, path, parent, rets, mode, expression) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.mode = mode;
    this.expression = expression;
    Object.freeze(this);
}

AfterExpressionBlock.prototype.next = function next(type, space, text, scanner) {
    if (text === '|') {
        return new SwitchBlock(this.story, this.path, this.parent, this.rets)
            .start(scanner, this.expression, null, 0, this.mode);
    } else if (text === '?') {
        return new SwitchBlock(this.story, this.path, this.parent, this.rets)
            .start(scanner, expression.invert(this.expression), null, 0, this.mode, 2);
    // istanbul ignore else
    } else if (text === '}') {
        var node = this.story.create(this.path, 'echo', this.expression, scanner.position());
        tiePath(this.rets, this.path);
        return this.parent.return(Path.next(this.path), [node], [], scanner)
            .next(type, space, text, scanner);
    } else {
        this.story.error('Expected |, ?, or } after expression, got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent.return(this.path, [], [], scanner)
            .next(type, space, text, scanner);
    }
};

function SwitchBlock(story, path, parent, rets) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.node = null;
    this.branches = [];
    this.weights = [];
}

SwitchBlock.prototype.start = function start(scanner, expression, variable, value, mode, min) {
    value = value || 0;
    if (mode === 'loop' && !expression) {
        value = 1;
    }
    expression = expression || ['get', Path.toName(this.path)];
    var node = this.story.create(this.path, 'switch', expression, scanner.position());
    this.node = node;
    node.variable = variable;
    node.value = value;
    node.mode = mode;
    tiePath(this.rets, this.path);
    node.branches = this.branches;
    node.weights = this.weights;
    return new MaybeWeightedCase(this.story, new Case(this.story, Path.firstChild(this.path), this, [], this.branches, min || 0));
};

SwitchBlock.prototype.return = function _return(path, rets, escs, scanner) {
    if (this.node.mode === 'pick') {
        tie(rets, 'RET');
        rets = [this.node];
        // TODO think about what to do with escs.
    } else {
        this.node.next = 'RET';
    }
    return this.parent.return(Path.next(this.path), rets, escs, scanner);
};

function Case(story, path, parent, rets, branches, min) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
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
            var node = this.story.create(path, 'goto', 'RET', scanner.position());
            this.rets.push(node);
            this.branches.push(Path.toName(path));
            path = Path.next(path);
        }
        return this.parent.return(path, this.rets, [], scanner)
            .next(type, space, text, scanner);
    }
};

Case.prototype.case = function _case(args, scanner) {
    this.parent.weights.push(args || ['val', 1]);
    var path = Path.zerothChild(this.path);
    var node = this.story.create(path, 'goto', 'RET', scanner.position());
    this.branches.push(Path.toName(path));
    return new Thread(this.story, path, this, [node], []);
};

Case.prototype.return = function _return(path, rets, escs, scanner) {
    return new Case(this.story, Path.next(this.path), this.parent, this.rets.concat(rets, escs), this.branches, this.min);
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
        return this.parent.case(null, scanner)
            .next(type, space, text, scanner);
    }
};

MaybeWeightedCase.prototype.return = function _return(args, scanner) {
    return this.parent.case(args, scanner);
};

function Program(story, path, parent, rets, escs) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
}

Program.prototype.next = function next(type, space, text, scanner) {
    if (type === 'stop' || text === '}') {
        return this.parent.return(this.path, this.rets, this.escs, scanner)
            .next(type, space, text, scanner);
    } else if (text === ',' || type === 'break') {
        return this;
    // istanbul ignore if
    } else if (type === 'error') {
        // Break out of recursive error loops
        return this.parent.return(this.path, this.rets, this.escs, scanner);
    } else {
        return expression.variable(this.story, new Assignment(this.story, this.path, this, this.rets, this.escs))
            .next(type, space, text, scanner);
    }
};

Program.prototype.return = function _return(path, rets, escs, scanner) {
    return new Program(this.story, path, this.parent, rets, escs);
};

function Assignment(story, path, parent, rets, escs) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
}

Assignment.prototype.return = function _return(expression, scanner) {
    // istanbul ignore else
    if (expression[0] === 'get' || expression[0] === 'var') {
        return new ExpectOperator(this.story, this.path, this.parent, this.rets, this.escs, expression);
    } else {
        this.story.error('Expected variable to assign, got: ' + JSON.stringify(expression) + ' at ' + scanner.position());
        return this.parent.return(this.path, this.rets, this.escs, scanner)
            .next('error', '', '', scanner);
    }
};

function ExpectOperator(story, path, parent, rets, escs, left) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.left = left;
    Object.freeze(this);
}

ExpectOperator.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (text === '=') {
        return expression(this.story, new ExpectExpression(this.story, this.path, this.parent, this.rets, this.escs, this.left, text));
    } else {
        this.story.error('Expected = operator, got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent.return(this.path, this.rets, this.escs, scanner);
    }
};

function ExpectExpression(story, path, parent, rets, escs, left, operator) {
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.left = left;
    this.operator = operator;
}

ExpectExpression.prototype.return = function _return(right, scanner) {
    var node;
    // TODO validate this.left as a valid move target
    tiePath(this.rets, this.path);
    node = this.story.create(this.path, 'move', null, scanner.position());
    node.target = this.left;
    node.source = right;
    return this.parent.return(Path.next(this.path), [node], this.escs, scanner);
};

function ThenExpect(expect, text, story, parent) {
    this.expect = expect;
    this.text = text;
    this.story = story;
    this.parent = parent;
    Object.freeze(this);
}

ThenExpect.prototype.return = function _return(path, rets, escs, scanner) {
    return new Expect(this.expect, this.text, this.story, path, this.parent, rets, escs);
};

function Expect(expect, text, story, path, parent, rets, escs) {
    this.expect = expect;
    this.text = text;
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
}

Expect.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore if
    if (type !== this.expect || text !== this.text) {
        this.story.error('Expected ' + this.expect + '/' + this.text + ', got ' + type + '/' + text + ' at ' + scanner.position());
    }
    return this.parent.return(this.path, this.rets, this.escs, scanner);
};

function tiePath(ends, next) {
    var name = Path.toName(next);
    tie(ends, name);
}

function tie(ends, name) {
    for (var i = 0; i < ends.length; i++) {
        var end = ends[i];
        if (end.type === 'branch') {
            end.node.branch = name;
        } else {
            end.next = name;
        }
    }
}
