import Scope from './scope.js';

const start = (story, path, base) => {
  const scope = new Scope(story, path, base);
  const stop = new Stop(scope);
  const start = scope.create('goto', 'RET', '1:1');
  return new Thread(scope.zerothChild(), stop, [start], []);
};

export default start;

class Stop {
  constructor(scope) {
    this.scope = scope;
    Object.freeze(this);
  }

  next(type, _space, text, scanner) {
    // The only way to reach this method is for there to be a bug in the
    // outline lexer, or a bug in the grammar.
    if (type !== 'stop') {
      this.scope.error(
        `${scanner.position()}: Expected end of file, got ${tokenName(type, text)}.`
      );
    }
    return new End();
  }

  return(_scope, rets, escs, _scanner) {
    Scope.tie(rets, 'RET');
    Scope.tie(escs, 'ESC');
    return this;
  }
}

class End {
  constructor() {
    Object.freeze(this);
  }

  next(_type, _space, _text, _scanner) {
    return this;
  }
}

// rets are tied to the next instruction
// escs are tied off after the next encountered prompt
class Thread {
  constructor(scope, parent, rets, escs) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (
      type === 'symbol' ||
      type === 'alphanum' ||
      type === 'number' ||
      type === 'literal' ||
      text === '--' ||
      text === '---'
    ) {
      return new Text(this.scope, space, text, this, this.rets);
    } else if (type === 'token') {
      if (text === '{') {
        return new Block(this.scope, new ThenExpect('token', '}', this), this.rets);
      } else if (text === '@') {
        return label(this.scope, new Label(this, this.rets));
      } else if (text === '->') {
        return label(this.scope, new Goto(this, this.rets));
      } else if (text === '<-') {
        // Explicitly tie rets to null by dropping them.
        Scope.tie(this.rets, 'RET');
        // Continue carrying escs to the next encountered prompt.
        // Advance the path so that option thread don't appear empty.
        return new Thread(this.scope.next(), this.parent, [], this.escs);
      } else if (text === '/') {
        const node = this.scope.create('break', null, scanner.position());
        this.scope.tie(this.rets);
        return new Thread(this.scope.next(), this.parent, [node], this.escs);
      } else if (text === '//') {
        const node = this.scope.create('paragraph', null, scanner.position());
        this.scope.tie(this.rets);
        return new Thread(this.scope.next(), this.parent, [node], this.escs);
      } else if (text === '{"' || text === "{'" || text === '"}' || text === "'}") {
        return new Text(this.scope, space, '', this, this.rets).next(type, '', text, scanner);
      } else if (text === '<') {
        return label(this.scope, new ThenExpect('token', '>', new Cue(this, this.rets, this.escs)));
      }
    } else if (type === 'start') {
      if (text === '+' || text === '*') {
        return new MaybeOption(this.scope, new ThenExpect('stop', '', this), this.rets, [], text);
      } else if (text === '-') {
        return new MaybeThread(
          this.scope,
          new ThenExpect('stop', '', this),
          this.rets,
          [],
          [],
          ' '
        );
      } else if (text === '>') {
        // tie off rets to the prompt.
        this.scope.tie(this.rets);
        // promote escs to rets, tying them off after the prompt.
        const rets = this.escs.slice();
        this.escs.length = 0;
        return new Ask(this.scope, new ThenExpect('stop', '', this), rets, []);
      } else {
        // if text === '!') {
        return new Program(this.scope, new ThenExpect('stop', '', this), this.rets, []);
      }
    } else if (type === 'dash') {
      const node = this.scope.create('rule', null, scanner.position());
      this.scope.tie(this.rets);
      return new Thread(this.scope.next(), this.parent, [node], this.escs);
    } else if (type === 'break') {
      return this;
    }
    if (type === 'stop' || text === '|' || text === ']' || text === '[' || text === '}') {
      return this.parent
        .return(this.scope, this.rets, this.escs, scanner)
        .next(type, space, text, scanner);
    }
    return new Text(this.scope, space, text, this, this.rets);
  }

  return(scope, rets, escs, _scanner) {
    // All rules above (in next) guarantee that this.rets has been passed to
    // any rule that might use them. If the rule fails to use them, they must
    // return them. However, escs are never passed to any rule that returns.
    return new Thread(scope, this.parent, rets, this.escs.concat(escs));
  }
}

class Text {
  constructor(scope, lift, text, parent, rets) {
    this.scope = scope;
    this.lift = lift;
    this.text = text;
    this.parent = parent;
    this.rets = rets;
    Object.seal(this);
  }

  next(type, space, text, scanner) {
    if (type === 'alphanum' || type === 'number' || type === 'symbol' || type === 'literal') {
      this.text += space + text;
      return this;
    } else if (type === 'token') {
      if (text === '{"') {
        this.text += `${space}“`;
        return this;
      } else if (text === '"}') {
        this.text += `${space}”`;
        return this;
      } else if (text === "{'") {
        this.text += `${space}‘`;
        return this;
      } else if (text === "'}") {
        this.text += `${space}’`;
        return this;
      } else if ((text === '/' || text === '//') && space === '') {
        // This is an exception to accommodate hyperlinks.
        // Paragraphs and line breaks must be expressed by the / and //
        // tokens and must be preceded by space.
        this.text += text;
        return this;
      }
    } else if (text === '--') {
      this.text += `${space}–`; // en-dash
      return this;
    } else if (text === '---') {
      this.text += `${space}—`; // em-dash
      return this;
    }
    this.scope.tie(this.rets);
    const node = this.scope.create('text', this.text, scanner.position());
    node.lift = this.lift;
    node.drop = space;
    return this.parent
      .return(this.scope.next(), [node], [], scanner)
      .next(type, space, text, scanner);
  }
}

class MaybeThread {
  constructor(scope, parent, rets, escs, skips, space) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.skips = skips;
    this.space = space || '';
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (type === 'token') {
      if (text === '{') {
        return expression(
          this.scope,
          new ThenExpect(
            'token',
            '}',
            new ThreadCondition(this.parent, this.rets, this.escs, this.skips)
          )
        );
      }
    }
    return new Thread(this.scope, this, this.rets, this.escs).next(
      type,
      this.space || space,
      text,
      scanner
    );
  }

  return(scope, rets, escs, scanner) {
    return this.parent.return(scope, rets.concat(this.skips), escs, scanner);
  }
}

class ThreadCondition {
  constructor(parent, rets, escs, skips) {
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.skips = skips;
    Object.freeze(this);
  }

  return(scope, args, scanner) {
    const node = scope.create('jump', invertExpression(args), scanner.position());
    const branch = new Branch(node);
    scope.tie(this.rets);
    return new MaybeThread(
      scope.next(),
      this.parent,
      [node],
      this.escs,
      this.skips.concat([branch])
    );
  }
}

class MaybeOption {
  constructor(scope, parent, rets, escs, leader) {
    this.scope = scope;
    this.at = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.leader = leader;
    this.conditions = [];
    this.consequences = [];
    this.keywords = {};
    this.descended = false;
    Object.seal(this);
  }

  next(type, space, text, scanner) {
    if (type === 'token') {
      if (text === '{') {
        return new OptionOperator(this.scope, new ThenExpect('token', '}', this));
      }
      // Recognize the inequality token as individual keyword tokens with an
      // empty string amid them in this context.
      if (text === '<>') {
        return this.return(this.scope, 'keyword', '');
      }
      if (text === '<') {
        return new Keyword(this.scope, this);
      }
    }
    return this.option(scanner).next(type, space, text, scanner);
  }

  return(_scope, operator, expression, modifier, _scanner) {
    if (operator === '+' || operator === '-' || operator === '!') {
      modifier = modifier || ['val', 1];
    }
    if (operator === '?') {
      modifier = modifier || ['val', 0];
    }
    if (operator === '+' || operator === '-') {
      this.consequences.push([expression, [operator, expression, modifier]]);
    }
    if (operator === '-') {
      this.conditions.push(['>=', expression, modifier]);
    }
    if (operator === '') {
      this.conditions.push(expression);
    }
    if (operator === '=' || operator === '!' || operator === '?') {
      this.conditions.push(['<>', expression, modifier]);
      this.consequences.push([expression, modifier]);
    }
    if (operator === 'keyword') {
      this.keywords[expression] = true;
    }
    return this;
  }

  advance() {
    if (this.descended) {
      this.at = this.at.next();
    } else {
      this.at = this.at.firstChild();
      this.descended = true;
    }
  }

  option(scanner) {
    const variable = this.scope.name();
    const rets = [];

    this.at.tie(this.rets);

    if (this.leader === '*') {
      this.consequences.push([
        ['get', variable],
        ['+', ['get', variable], ['val', 1]],
      ]);
      const jump = this.at.create(
        'jump',
        ['<>', ['get', variable], ['val', 0]],
        scanner.position()
      );
      const jumpBranch = new Branch(jump);
      rets.push(jumpBranch);
      this.advance();
      this.at.tie([jump]);
    }

    for (const condition of this.conditions) {
      const jump = this.at.create('jump', ['==', condition, ['val', 0]], scanner.position());
      const jumpBranch = new Branch(jump);
      rets.push(jumpBranch);
      this.advance();
      this.at.tie([jump]);
    }

    const option = new Option(
      this.scope,
      this.parent,
      rets,
      this.escs,
      this.leader,
      this.consequences
    );
    option.node = this.at.create('option', null, scanner.position());
    option.node.keywords = Object.keys(this.keywords).sort();
    this.advance();

    option.next = this.at;
    return option.thread(
      scanner,
      new OptionThread(this.at, option, [], option, 'qa', AfterInitialQA)
    );
  }
}

// Captures <keyword> annotations on options.
class Keyword {
  constructor(scope, parent) {
    this.scope = scope;
    this.parent = parent;
    this.keyword = '';
    this.space = '';
    Object.seal(this);
  }

  next(_type, space, text, _scanner) {
    if (text === '>') {
      return this.parent.return(this.scope, 'keyword', this.keyword);
    }
    this.keyword += (this.space && space) + text;
    this.space = ' ';
    return this;
  }
}

// {+x}, {-x}, {!x}, {+n x}, {-n x}, {=n x} or simply {x}
class OptionOperator {
  constructor(scope, parent) {
    this.scope = scope;
    this.parent = parent;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (text === '+' || text === '-' || text === '=' || text === '!' || text === '?') {
      return expression(this.scope, new OptionArgument(this.parent, text));
    } else {
      return expression(this.scope, new OptionArgument2(this.parent, '')).next(
        type,
        space,
        text,
        scanner
      );
    }
  }
}

class OptionArgument {
  constructor(parent, operator) {
    this.parent = parent;
    this.operator = operator;
    Object.freeze(this);
  }

  return(scope, args, scanner) {
    if (args[0] === 'get' || args[0] === 'var') {
      return this.parent.return(scope, this.operator, args, this.args, scanner);
    } else {
      return expression(scope, new OptionArgument2(this.parent, this.operator, args));
    }
  }
}

class OptionArgument2 {
  constructor(parent, operator, args) {
    this.parent = parent;
    this.operator = operator;
    this.args = args;
    Object.freeze(this);
  }

  return(scope, args, scanner) {
    return this.parent.return(scope, this.operator, args, this.args, scanner);
  }
}

class Option {
  constructor(scope, parent, rets, escs, leader, consequences) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets; // to tie off to the next option
    this.escs = escs; // to tie off to the next node after the next prompt
    this.node = null;
    this.leader = leader;
    this.consequences = consequences;
    this.next = scope.next();
    this.mode = '';
    this.branch = null;
    Object.seal(this);
  }

  return(scope, rets, escs, scanner) {
    // Create a jump from the end of the answer.
    if (this.mode !== 'a') {
      // If the answer is reused in the question, create a dedicated jump and
      // add it to the end of the answer.
      const jump = scope.create('goto', 'RET', scanner.position());
      this.node.answer.push(scope.name());
      rets.push(jump);
    }

    return this.parent.return(
      this.scope.next(),
      this.rets.concat([this.node]),
      this.escs.concat(rets, escs),
      scanner
    );
  }

  thread(scanner, parent) {
    // Creat a dummy node, to replace if necessary, for arcs that begin with a
    // goto/divert arrow that otherwise would have loose rets to forward.
    const placeholder = this.next.create('goto', 'RET', scanner.position());
    return new Thread(this.next, parent, [placeholder], []);
  }

  push(scope, mode) {
    const next = this.next.name();
    const end = scope.name();
    if (next !== end) {
      if (mode === 'q' || mode === 'qa') {
        this.node.question.push(next);
      }
      if (mode === 'a' || mode === 'qa') {
        this.node.answer.push(next);
      }
      this.next = scope;
      this.mode = mode;
    }
  }
}

// An option thread captures the end of an arc, and if the path has advanced,
// adds that arc to the option's questions and/or answer depending on the
// "mode" ("q", "a", or "qa") and proceeds to the following state.
class OptionThread {
  constructor(scope, parent, rets, option, mode, Next) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    this.mode = mode;
    this.Next = Next;
    Object.freeze(this);
  }

  return(scope, rets, escs, _scanner) {
    this.option.push(scope, this.mode);
    // TODO investigate whether we can consistently tie off received rets
    // instead of passing them forward to OptionThread, which consistently
    // just terminates them on their behalf.
    Scope.tie(this.rets, 'RET');
    // TODO no test exercises this kind of jump.
    Scope.tie(escs, 'ESC');
    return new this.Next(scope, this.parent, rets, this.option);
  }
}

// Every option begins with a (potentially empty) thread before the first open
// backet that will contribute both to the question and the answer.
class AfterInitialQA {
  constructor(scope, parent, rets, option) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
  }

  next(type, _space, text, scanner) {
    if (type === 'token' && text === '[') {
      return this.option.thread(scanner, new AfterQorA(this.scope, this, this.rets, this.option));
    } else {
      this.scope.error(
        `${scanner.position()}: Expected "[]" brackets in option but got ${tokenName(type, text)}.`
      );
      return this.return(this.scope, this.rets, [], scanner);
    }
  }

  // The thread returns to this level after capturing the bracketed terms,
  // after which anything and everything to the end of the block contributes
  // to the answer.
  return(scope, rets, escs, scanner) {
    Scope.tie(rets, 'RET');
    // TODO no test exercises these escs.
    Scope.tie(escs, 'ESC');

    rets = [];

    // Thread consequences, including incrementing the option variable name
    const consequences = this.option.consequences;
    if (consequences.length) {
      this.option.node.answer.push(scope.name());
    }
    for (const consequence of consequences) {
      const node = scope.create('move', null, scanner.position());
      node.source = consequence[1];
      node.target = consequence[0];
      scope.tie(rets);
      scope = scope.next();
      rets = [node];
    }

    this.option.next = scope;
    return this.option.thread(
      scanner,
      new OptionThread(scope, this.parent, rets, this.option, 'a', AfterFinalA)
    );
  }
}

// After capturing the first arc within brackets, which may either contribute
// to the question or the answer, we decide which based on whether there is a
// following bracket.
class DecideQorA {
  constructor(scope, parent, rets, option) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
  }

  next(type, _space, text, scanner) {
    if (type === 'token' && text === '[') {
      // A
      this.option.push(this.scope, 'a');
      return this.option.thread(
        scanner,
        new OptionThread(this.scope, this, this.rets, this.option, 'q', ExpectFinalBracket)
      );
    } else if (type === 'token' && text === ']') {
      // Q
      this.option.push(this.scope, 'q');
      return this.parent.return(this.scope, this.rets, [], scanner);
    } else {
      this.scope.error(
        `${scanner.position()}: Expected "]" to end option but got ${tokenName(type, text)}.`
      );
      return this.parent.return(this.scope, this.rets, [], scanner);
    }
  }

  // If the brackets contain a sequence of question thread like [A [Q] QA [Q]
  // QA...], then after each [question], we return here for continuing QA arcs.
  return(scope, rets, escs, scanner) {
    // TODO no test exercises these escs.
    Scope.tie(escs, 'ESC');
    return this.option.thread(
      scanner,
      new OptionThread(scope, this.parent, rets, this.option, 'qa', AfterQA)
    );
  }
}

// After a Question/Answer thread, there can always be another [Q] thread
// ad nauseam. Here we check whether this is the end of the bracketed
// expression or continue after a [Question].
class AfterQA {
  constructor(scope, parent, rets, option) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
  }

  next(type, _space, text, scanner) {
    if (type === 'token' && text === '[') {
      return this.option.thread(
        scanner,
        new OptionThread(this.scope, this, this.rets, this.option, 'q', ExpectFinalBracket)
      );
    } else if (type === 'token' && text === ']') {
      return this.parent.return(this.scope, this.rets, [], scanner);
    } else {
      this.scope.error(
        `${scanner.position()}: Expected "]" to end option but got ${tokenName(type, text)}.`
      );
      return this.parent.return(this.scope, this.rets, [], scanner);
    }
  }

  return(_scope, rets, escs, scanner) {
    // TODO terminate returned scope
    // TODO no test exercises these escapes.
    Scope.tie(escs, 'ESC');
    return this.option.thread(
      scanner,
      new OptionThread(this.scope, this.parent, rets, this.option, 'qa', ExpectFinalBracket)
    );
  }
}

// The bracketed terms may either take the form [Q] or [A, ([Q] QA)*].
// This captures the first arc without committing to either Q or A until we
// know whether it is followed by a bracketed term.
class AfterQorA {
  constructor(scope, parent, rets, option) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
  }

  // Just capture the path and proceed.
  return(scope, rets, escs, _scanner) {
    // TODO consider whether this could have been done earlier.
    Scope.tie(this.rets, 'RET');
    // TODO no test exercises these escapes.
    Scope.tie(escs, 'ESC');
    return new DecideQorA(scope, this.parent, rets, this.option);
  }
}

// After a [Q] or [A [Q] QA...] block, there must be a closing bracket and we
// return to the parent arc of the option.
class ExpectFinalBracket {
  constructor(scope, parent, rets, option) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.option = option;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (type !== 'token' || text !== ']') {
      this.scope.error(`${scanner.position()}: Expected "]" to end option.`);
      return this.parent
        .return(this.scope, this.rets, [], scanner)
        .next('token', space, ']', scanner);
    }
    return this.parent.return(this.scope, this.rets, [], scanner);
  }
}

// After the closing bracket in an option], everything that remains is the last
// node of the answer. After that thread has been submitted, we expect the
// block to end.
class AfterFinalA {
  constructor(scope, parent, rets, _option) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    return this.parent.return(this.scope, this.rets, [], scanner).next(type, space, text, scanner);
  }
}

// This concludes the portion dedicated to parsing options

// Branch is a fake story node. It serves to mark that the wrapped node's
// "branch" label should be tied instead of its "next" label.
class Branch {
  constructor(node) {
    this.type = 'branch';
    this.node = node;
    Object.freeze(this);
  }
}

class Label {
  constructor(parent, rets) {
    this.parent = parent;
    this.rets = rets;
    Object.freeze(this);
  }

  return(scope, expression, scanner) {
    const [head, ...tail] = expression;
    if (head === 'get') {
      const [label] = tail;
      if (label === '...') {
        const node = scope.create('goto', 'RET', scanner.position());
        scope.tie(this.rets);
        return new Thread(scope, new Loop(scope, this.parent), [node], []);
      } else {
        const labelScope = scope.label(label);
        // place-holder goto thunk
        const node = labelScope.create('goto', 'RET', scanner.position());
        scope.tie(this.rets);
        // rets also forwarded so they can be tied off if the goto is replaced.
        return this.parent.return(labelScope, this.rets.concat([node]), [], scanner);
      }
    } else if (head === 'call') {
      const [label, ...args] = tail;
      const labelScope = scope.label(label[1]);
      const node = labelScope.create('def', null, scanner.position());
      const params = [];
      for (const arg of args) {
        if (arg[0] === 'get') {
          params.push(arg[1]);
        } else {
          scope.error(`${scanner.position()}: Expected parameter name but got expression.`);
        }
      }
      node.locals = params;
      return new Thread(
        labelScope.next(),
        new ConcludeProcedure(scope, this.parent, this.rets),
        [node],
        []
      );
    } else {
      scope.error(`${scanner.position()}: Expected label after "@".`);
      return new Thread(scope, this.parent, this.rets, []);
    }
  }
}

class Loop {
  constructor(scope, parent) {
    this.scope = scope;
    this.parent = parent;
    this.label = scope.name();
    Object.freeze(this);
  }

  return(scope, rets, _escs, scanner) {
    // tie back rets
    this.scope.tie(rets);
    // TODO tie back escs
    return this.parent.return(scope, [], [], scanner);
  }
}

class ConcludeProcedure {
  constructor(scope, parent, rets) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    Object.freeze(this);
  }

  return(_scope, rets, escs, scanner) {
    // After a procedure, connect prior rets.
    Scope.tie(rets, 'RET');
    // Dangling escs go to an escape instruction, to follow the jump path in
    // the parent scope, determined at run time.
    Scope.tie(escs, 'ESC');
    return this.parent.return(this.scope, this.rets, [], scanner);
  }
}

class Goto {
  constructor(parent, rets) {
    this.parent = parent;
    this.rets = rets;
  }

  return(scope, args, scanner) {
    if (args[0] === 'get') {
      Scope.tie(this.rets, args[1]);
      return this.parent.return(scope.next(), [], [], scanner);
    } else if (args[0] === 'call') {
      const label = args[1][1];
      const node = scope.create('call', label, scanner.position());
      node.args = args.slice(2);
      scope.tie(this.rets);
      return this.parent.return(scope.next(), [node], [new Branch(node)], scanner);
    } else {
      scope.error(`${scanner.position()}: Expected label after goto arrow but got expression.`);
      return new Thread(scope, this.parent, this.rets, []);
    }
  }
}

class Cue {
  constructor(parent, rets, escs) {
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
  }

  return(scope, expression, scanner) {
    if (expression.length === 0 || expression[0] !== 'get') {
      scope.error(`${scanner.position()}: Expected cue.`);
      return this.parent.return(scope, this.rets, this.escs, scanner);
    } else {
      const cue = expression[1];
      const node = scope.create('cue', cue, scanner.position());
      scope.tie(this.rets);
      return this.parent.return(scope.next(), [node], this.escs, scanner);
    }
  }
}

const mutators = {
  '=': true,
  '+': true,
  '-': true,
  '*': true,
  '/': true,
};

const toggles = {
  '!': ['val', 1],
  '?': ['val', 0],
};

const variables = {
  '@': 'loop',
  '#': 'hash',
  '^': 'pick',
};

const switches = {
  '&': 'loop',
  '~': 'rand',
};

class Block {
  constructor(scope, parent, rets) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (type !== 'start') {
      if (text === '(') {
        return expression(this.scope, new ExpressionBlock(this.parent, this.rets, 'walk')).next(
          type,
          space,
          text,
          scanner
        );
      } else if (mutators[text]) {
        return expression(this.scope, new SetBlock(this.parent, this.rets, text));
      } else if (toggles[text]) {
        return expression(this.scope, new ToggleBlock(this.parent, this.rets, toggles[text]));
      } else if (variables[text]) {
        return expression(this.scope, new ExpressionBlock(this.parent, this.rets, variables[text]));
      } else if (switches[text]) {
        return new SwitchBlock(this.scope, this.parent, this.rets).start(
          scanner,
          null,
          this.scope.name(),
          null,
          switches[text]
        );
      }
    }
    return new SwitchBlock(this.scope, this.parent, this.rets)
      .start(scanner, null, this.scope.name(), 1, 'walk') // with variable and value, waiting for case to start
      .next(type, space, text, scanner);
  }
}

class SetBlock {
  constructor(parent, rets, op) {
    this.op = op;
    this.parent = parent;
    this.rets = rets;
    Object.freeze(this);
  }

  return(scope, expression, _scanner) {
    return new MaybeSetVariable(scope, this.parent, this.rets, this.op, expression);
  }
}

class MaybeSetVariable {
  constructor(scope, parent, rets, op, expression) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.op = op;
    this.expression = expression;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (type === 'token' && text === '}') {
      return this.set(['val', 1], this.expression, scanner).next(type, space, text, scanner);
    }
    return expression(this.scope, this).next(type, space, text, scanner);
  }

  set(source, target, scanner) {
    const node = this.scope.create('move', null, scanner.position());
    if (this.op === '=') {
      node.source = source;
    } else {
      node.source = [this.op, target, source];
    }
    node.target = target;
    this.scope.tie(this.rets);
    return this.parent.return(this.scope.next(), [node], [], scanner);
  }

  return(_scope, target, scanner) {
    return this.set(this.expression, target, scanner);
  }
}

class ToggleBlock {
  constructor(parent, rets, source) {
    this.parent = parent;
    this.rets = rets;
    this.source = source;
    Object.freeze(this);
  }

  return(scope, expression, scanner) {
    const node = scope.create('move', null, scanner.position());
    node.source = this.source;
    node.target = expression;
    scope.tie(this.rets);
    return this.parent.return(scope.next(), [node], [], scanner);
  }
}

class ExpressionBlock {
  constructor(parent, rets, mode) {
    this.parent = parent;
    this.rets = rets;
    this.mode = mode;
    Object.freeze(this);
  }

  return(scope, expression, _scanner) {
    return new AfterExpressionBlock(scope, this.parent, this.rets, this.mode, expression);
  }
}

class AfterExpressionBlock {
  constructor(scope, parent, rets, mode, expression) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.mode = mode;
    this.expression = expression;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (text === '|') {
      return new SwitchBlock(this.scope, this.parent, this.rets).start(
        scanner,
        this.expression,
        null,
        0,
        this.mode
      );
    } else if (text === '?') {
      return new SwitchBlock(this.scope, this.parent, this.rets).start(
        scanner,
        invertExpression(this.expression),
        null,
        0,
        this.mode,
        2
      );
    } else if (text === '}') {
      const node = this.scope.create('echo', this.expression, scanner.position());
      this.scope.tie(this.rets);
      return this.parent
        .return(this.scope.next(), [node], [], scanner)
        .next(type, space, text, scanner);
    } else {
      this.scope.error(
        `${scanner.position()}: Expected "|", "?", or "}" after expression but got ${tokenName(
          type,
          text
        )}.`
      );
      return this.parent.return(this.scope, [], [], scanner);
    }
  }
}

class SwitchBlock {
  constructor(scope, parent, rets) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.node = null;
    this.branches = [];
    this.weights = [];
    Object.seal(this);
  }

  start(scanner, expression, variable, value, mode, min) {
    value = value || 0;
    if (mode === 'loop' && !expression) {
      value = 1;
    }
    expression = expression || ['get', this.scope.name()];
    const node = this.scope.create('switch', expression, scanner.position());
    this.node = node;
    node.variable = variable;
    node.value = value;
    node.mode = mode;
    this.scope.tie(this.rets);
    node.branches = this.branches;
    node.weights = this.weights;
    return new MaybeWeightedCase(
      this.scope,
      new Case(this.scope.firstChild(), this, [], this.branches, min || 0)
    );
  }

  return(_scope, rets, escs, scanner) {
    if (this.node.mode === 'pick') {
      Scope.tie(rets, 'RET');
      rets = [this.node];
      // TODO think about what to do with escs.
    } else {
      this.node.next = 'RET';
    }
    return this.parent.return(this.scope.next(), rets, escs, scanner);
  }
}

class Case {
  constructor(scope, parent, rets, branches, min) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.branches = branches;
    this.min = min;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (text === '|') {
      return new MaybeWeightedCase(this.scope, this);
    } else {
      let scope = this.scope;
      while (this.branches.length < this.min) {
        const node = scope.create('goto', 'RET', scanner.position());
        this.rets.push(node);
        this.branches.push(scope.name());
        scope = scope.next();
      }
      return this.parent.return(scope, this.rets, [], scanner).next(type, space, text, scanner);
    }
  }

  case(args, scanner) {
    this.parent.weights.push(args || ['val', 1]);
    const scope = this.scope.zerothChild();
    const node = scope.create('goto', 'RET', scanner.position());
    this.branches.push(scope.name());
    return new Thread(scope, this, [node], []);
  }

  return(_scope, rets, escs, _scanner) {
    return new Case(
      this.scope.next(),
      this.parent,
      this.rets.concat(rets, escs),
      this.branches,
      this.min
    );
  }
}

class MaybeWeightedCase {
  constructor(scope, parent) {
    this.scope = scope;
    this.parent = parent;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (text === '(') {
      return expression(this.scope, this).next(type, space, text, scanner);
    } else {
      return this.parent.case(null, scanner).next(type, space, text, scanner);
    }
  }

  return(_scope, args, scanner) {
    return this.parent.case(args, scanner);
  }
}

class Ask {
  constructor(scope, parent, rets, escs) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (type == 'alphanum') {
      return new Read(text, this.scope, this.parent, this.rets, this.escs);
    }
    this.scope.create('ask', null, scanner.position());
    return new Thread(this.scope.next(), this.parent, this.rets, this.escs).next(
      type,
      space,
      text,
      scanner
    );
  }
}

class Read {
  constructor(variable, scope, parent, rets, escs) {
    this.variable = variable;
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (type == 'alphanum') {
      return this.return(text, scanner);
    }
    return this.return(null, scanner).next(type, space, text, scanner);
  }

  return(cue, scanner) {
    const node = this.scope.create('read', this.variable, scanner.position());
    node.cue = cue;
    return new Thread(this.scope.next(), this.parent, this.rets.concat([node]), this.escs);
  }
}

class Program {
  constructor(scope, parent, rets, escs) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
  }

  next(type, space, text, scanner) {
    if (type === 'stop' || text === '}') {
      return this.parent
        .return(this.scope, this.rets, this.escs, scanner)
        .next(type, space, text, scanner);
    } else if (text === ',' || type === 'break') {
      return this;
    } else if (type === 'error') {
      // Break out of recursive error loops
      return this.parent.return(this.scope, this.rets, this.escs, scanner);
    } else {
      return variable(this.scope, new Assignment(this.scope, this, this.rets, this.escs)).next(
        type,
        space,
        text,
        scanner
      );
    }
  }

  return(scope, rets, escs, _scanner) {
    return new Program(scope, this.parent, rets, escs);
  }
}

class Assignment {
  constructor(scope, parent, rets, escs) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    Object.freeze(this);
  }

  return(_scope, expression, scanner) {
    if (expression[0] === 'get' || expression[0] === 'var') {
      return new ExpectOperator(this.scope, this.parent, this.rets, this.escs, expression);
    } else {
      this.scope.error(
        `${scanner.position()}: Expected variable to assign but got ${JSON.stringify(expression)}.`
      );
      return this.parent
        .return(this.scope, this.rets, this.escs, scanner)
        .next('error', '', '', scanner);
    }
  }
}

class ExpectOperator {
  constructor(scope, parent, rets, escs, left) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.left = left;
    Object.freeze(this);
  }

  next(type, _space, text, scanner) {
    if (text === '=') {
      return expression(
        this.scope,
        new ExpectExpression(this.scope, this.parent, this.rets, this.escs, this.left, text)
      );
    } else {
      this.scope.error(
        `${scanner.position()}: Expected "=" operator but got ${tokenName(type, text)}.`
      );
      return this.parent.return(this.scope, this.rets, this.escs, scanner);
    }
  }
}

class ExpectExpression {
  constructor(scope, parent, rets, escs, left, operator) {
    this.scope = scope;
    this.parent = parent;
    this.rets = rets;
    this.escs = escs;
    this.left = left;
    this.operator = operator;
    Object.freeze(this);
  }

  return(_scope, right, scanner) {
    // TODO validate this.left as a valid move target
    this.scope.tie(this.rets);
    const node = this.scope.create('move', null, scanner.position());
    node.target = this.left;
    node.source = right;
    return this.parent.return(this.scope.next(), [node], this.escs, scanner);
  }
}

const unary = {
  not: true,
  '-': true,
  '~': true,
  '#': true,
};

const exponential = {
  '**': true, // x ** y
};

const multiplicative = {
  '*': true,
  '/': true,
  '%': true,
  rem: true,
  '~': true,
};

const arithmetic = {
  '+': true,
  '-': true,
};

const comparison = {
  '<': true,
  '<=': true,
  '==': true,
  '<>': true,
  '>=': true,
  '>': true,
  '#': true,
};

const intersection = {
  and: true,
};

const union = {
  or: true,
};

const precedence = [
  // from low to high
  union,
  intersection,
  comparison,
  arithmetic,
  multiplicative,
  exponential,
];

const expression = (scope, parent) => {
  for (const operators of precedence) {
    parent = new BinaryExpression(operators, parent);
  }
  return new Unary(scope, parent);
};

const variable = (scope, parent) => {
  return new GetStaticVariable(scope, parent, [], [], '', true);
};

const label = (scope, parent) => {
  return new GetStaticVariable(scope, new AfterVariable(parent), [], [], '', true);
};

const inversions = {
  '==': '<>',
  '<>': '==',
  '>': '<=',
  '<': '>=',
  '>=': '<',
  '<=': '>',
};

const invertExpression = expression => {
  if (expression[0] === 'not') {
    return expression[1];
  } else if (inversions[expression[0]]) {
    return [inversions[expression[0]], expression[1], expression[2]];
  } else {
    return ['not', expression];
  }
};

class Open {
  constructor(parent) {
    this.parent = parent;
    Object.seal(this);
  }

  return(scope, expression, _scanner) {
    return new Close(scope, this.parent, expression);
  }
}

class Close {
  constructor(scope, parent, expression) {
    this.scope = scope;
    this.parent = parent;
    this.expression = expression;
    Object.seal(this);
  }

  next(type, _space, text, scanner) {
    if (type === 'symbol' && text === ')') {
      return this.parent.return(this.scope, this.expression, scanner);
    } else {
      this.scope.error(
        `${scanner.position()}: Expected parenthetical expression to end with ")" or continue with operator but got ${tokenName(
          type,
          text
        )}.`
      );
      return this.parent.return(this.scope, this.expression, scanner);
    }
  }
}

class Value {
  constructor(scope, parent) {
    this.scope = scope;
    this.parent = parent;
    Object.seal(this);
  }

  next(type, space, text, scanner) {
    if (type === 'number') {
      return this.parent.return(this.scope, ['val', +text], scanner);
    } else if (text === '(') {
      return expression(this.scope, new Open(this.parent));
    } else if (text === '{') {
      return expression(this.scope, new GetDynamicVariable(this.parent, [''], []));
    } else if (type === 'alphanum') {
      return new GetStaticVariable(this.scope, new AfterVariable(this.parent), [], [], text, false);
    } else {
      this.scope.error(
        `${scanner.position()}: Expected expression but got ${tokenName(type, text)}.`
      );
      return this.parent.return(this.scope, ['val', 0], scanner).next(type, space, text, scanner);
    }
  }
}

class AfterVariable {
  constructor(parent) {
    this.parent = parent;
    Object.seal(this);
  }

  return(scope, expression, _scanner) {
    return new MaybeCall(scope, this.parent, expression);
  }
}

class MaybeCall {
  constructor(scope, parent, expression) {
    this.scope = scope;
    this.parent = parent;
    this.expression = expression;
    Object.seal(this);
  }

  next(type, space, text, scanner) {
    if (space === '' && text === '(') {
      return new Arguments(this.scope, this.parent, this.expression);
    } else {
      return this.parent
        .return(this.scope, this.expression, scanner)
        .next(type, space, text, scanner);
    }
  }
}

class Arguments {
  constructor(scope, parent, expression) {
    this.scope = scope;
    this.parent = parent;
    this.args = ['call', expression];
  }

  next(type, space, text, scanner) {
    if (text === ')') {
      return this.parent.return(this.scope, this.args, scanner);
    } else {
      return expression(this.scope, this).next(type, space, text, scanner);
    }
  }

  return(scope, expression, _scanner) {
    this.args.push(expression);
    return new MaybeArgument(scope, this);
  }
}

class MaybeArgument {
  constructor(scope, parent) {
    this.scope = scope;
    this.parent = parent;
    Object.seal(this);
  }

  next(type, space, text, scanner) {
    if (text === ',') {
      return expression(this.scope, this.parent);
    } else if (text === ')') {
      return this.parent.next(type, space, text, scanner);
    } else {
      this.scope.error(
        `${scanner.position()}: Expected "," or ")" to end or argument list but got ${tokenName(
          type,
          text
        )}.`
      );
      return this.parent;
    }
  }
}

class Unary {
  constructor(scope, parent) {
    this.scope = scope;
    this.parent = parent;
    Object.seal(this);
  }

  next(type, space, text, scanner) {
    if (unary[text] === true) {
      return new Unary(this.scope, new UnaryOperator(this.parent, text));
    } else {
      return new Value(this.scope, this.parent).next(type, space, text, scanner);
    }
  }
}

class UnaryOperator {
  constructor(parent, op) {
    this.parent = parent;
    this.op = op;
  }

  return(scope, expression, scanner) {
    return this.parent.return(scope, [this.op, expression], scanner);
  }
}

class MaybeOperator {
  constructor(scope, parent, expression, operators) {
    this.scope = scope;
    this.parent = parent;
    this.expression = expression;
    this.operators = operators;
    Object.seal(this);
  }

  next(type, space, text, scanner) {
    if (this.operators[text] === true) {
      let parent = new MaybeExpression(this.parent, this.operators);
      parent = new PartialExpression(parent, text, this.expression);
      for (let i = precedence.indexOf(this.operators) + 1; i < precedence.length; i++) {
        parent = new MaybeExpression(parent, precedence[i]);
      }
      return new Unary(this.scope, parent);
    } else {
      return this.parent
        .return(this.scope, this.expression, scanner)
        .next(type, space, text, scanner);
    }
  }
}

class MaybeExpression {
  constructor(parent, operators) {
    this.parent = parent;
    this.operators = operators;
    Object.seal(this);
  }

  return(scope, expression, _scanner) {
    return new MaybeOperator(scope, this.parent, expression, this.operators);
  }
}

class PartialExpression {
  constructor(parent, operator, expression) {
    this.parent = parent;
    this.operator = operator;
    this.expression = expression;
  }

  return(scope, expression, scanner) {
    return this.parent.return(scope, [this.operator, this.expression, expression], scanner);
  }
}

class BinaryExpression {
  constructor(operators, parent) {
    this.parent = parent;
    this.operators = operators;
    Object.seal(this);
  }

  return(scope, expression, _scanner) {
    return new MaybeOperator(scope, this.parent, expression, this.operators);
  }
}

class GetDynamicVariable {
  constructor(parent, literals, expressions) {
    this.parent = parent;
    this.literals = literals;
    this.expressions = expressions;
    Object.seal(this);
  }

  return(scope, expression, _scanner) {
    return new Expect(
      'token',
      '}',
      scope,
      new ContinueVariable(scope, this.parent, this.literals, this.expressions.concat([expression]))
    );
  }
}

class ContinueVariable {
  constructor(scope, parent, literals, expressions) {
    this.scope = scope;
    this.parent = parent;
    this.literals = literals;
    this.expressions = expressions;
    Object.freeze(this);
  }

  return() {
    return new GetStaticVariable(this.scope, this.parent, this.literals, this.expressions, '');
  }
}

class GetStaticVariable {
  constructor(scope, parent, literals, expressions, literal, fresh) {
    this.scope = scope;
    this.parent = parent;
    this.literals = literals;
    this.expressions = expressions;
    this.literal = literal;
    this.fresh = fresh;
    Object.seal(this);
  }

  next(type, space, text, scanner) {
    if (type !== 'literal' && (space === '' || this.fresh)) {
      this.fresh = false;
      if (text === '{') {
        return expression(
          this.scope,
          new GetDynamicVariable(
            this.parent,
            this.literals.concat([this.literal]),
            this.expressions
          )
        );
      } else if (text === '.') {
        this.literal += text;
        return this;
      } else if (type === 'alphanum' || type === 'number') {
        this.literal += text;
        return this;
      }
    }

    if (this.literals.length !== 0 || this.expressions.length !== 0) {
      return this.parent
        .return(
          this.scope,
          ['var', this.literals.concat([this.literal]), this.expressions],
          scanner
        )
        .next(type, space, text, scanner);
    }

    if (this.literal === '') {
      this.scope.error(`${scanner.position()}: Expected name but got ${tokenName(type, text)}`);
      return this.parent.return(this.scope, [], scanner);
    }

    return this.parent
      .return(this.scope, ['get', this.literal], scanner)
      .next(type, space, text, scanner);
  }
}

class ThenExpect {
  constructor(expect, text, parent) {
    this.expect = expect;
    this.text = text;
    this.parent = parent;
    Object.freeze(this);
  }

  return(scope) {
    const args = [];
    for (const arg of arguments) {
      args.push(arg);
    }
    return new Expect(this.expect, this.text, scope, this.parent, args);
  }
}

class Expect {
  constructor(expect, text, scope, parent, args) {
    this.expect = expect;
    this.text = text;
    this.scope = scope;
    this.parent = parent;
    this.args = args;
    Object.freeze(this);
  }

  next(type, _space, text, scanner) {
    if (type !== this.expect || text !== this.text) {
      this.scope.error(
        `${scanner.position()}: Expected ${tokenName(this.expect, this.text)} but got ${tokenName(
          type,
          text
        )}.`
      );
    }
    return this.parent.return.apply(this.parent, this.args);
  }
}

const tokenName = (type, text) => {
  // It might not be possible to provoke an error at the beginning of a new
  // block.
  if (type === 'start') {
    return `beginning of a new ${JSON.stringify(text)} block`;
  } else if (type === 'stop') {
    return 'to the end of the block';
  } else {
    return JSON.stringify(text);
  }
};
