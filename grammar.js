'use strict';

var Path = require('./path');
var story = require('./story');

exports.start = start;

function start(story) {
    var end = new End();
    var label = new Label(story, ['start'], end);
    return new Knot(story, ['start', 0], label, [label]);
}

function Label(story, path, parent) {
    this.type = 'label';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.tied = false;
    this.next = null;
    Object.seal(this);
}

Label.prototype.tie = function _tie(next) {
    this.next = next;
    this.tied = Path.toName(this.path) === next;
};

Label.prototype.return = function _return(path, ends, scanner) {
    if (!this.tied) {
        var label = this.story.create(this.path, 'goto', this.next);
        ends.push(label);
    }
    return this.parent.return(path, ends, scanner);
};

function End() {
    this.type = 'end';
    Object.seal(this);
}

// istanbul ignore next
End.prototype.next = function next(type, space, text, scanner) {
    throw new Error('nodes beyond root ' + type + ' ' + JSON.stringify(text));
};

End.prototype.return = function _return() {
    return this;
};

function Knot(story, path, parent, ends) {
    this.type = 'knot';
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.story = story;
    Object.seal(this);
}

Knot.prototype.next = function next(type, space, text, scanner) {
    if (type === 'stop') {
        return this.parent.return(this.path, this.ends, scanner);
    } else if (type === 'text' && text === '-') {
        return this;
    } else if (type === 'text') {
        return new Text(this.story, this.path, text, this.parent, this.ends);
    } else if (type === 'start' && (text === '+' || text === '*')) {
        tie(this.ends, this.path);
        return new Option(text, this.story, this.path, this, []);
    } else if (type === 'start' && text === '-') {
        tie(this.ends, this.path);
        var node = this.story.create(this.path, 'break');
        return new Knot(this.story, Path.next(this.path), this, [node]);
    } else if (type === 'start' && text === '') {
        return new Knot(this.story, this.path, this, this.ends);
    } else if (type === 'break') {
        return this;
    } else if (type === 'token' && text === '=') {
        return new ExpectLabel(this.story, this.path, this.parent, this.ends);
    // istanbul ignore else
    } else if (type === 'token' && text === '->') {
        return new Goto(this.story, this.path, this.parent, this.ends);
    } else {
        throw new Error(scanner.position() + ': no support for type in knot state: ' + type + ' ' + JSON.stringify(text));
    }
};

Knot.prototype.return = function _return(path, ends, scanner) {
    return new Knot(this.story, path, this.parent, ends);
};

function Text(story, path, text, parent, ends) {
    this.type = 'text';
    this.story = story;
    this.path = path;
    this.text = text;
    this.parent = parent;
    this.ends = ends;
}

Text.prototype.next = function next(type, space, text, scanner) {
    if (type === 'text') {
        this.text += space + text;
        return this;
    } else {
        tie(this.ends, this.path);
        var node = this.story.create(this.path, 'text', this.text);
        return new Knot(this.story, Path.next(this.path), this.parent, [node])
            .next(type, space, text, scanner);
    }
};

function Option(leader, story, path, parent, ends) {
    this.type = 'option';
    this.leader = leader;
    this.story = story;
    this.path = path;
    this.name = Path.toName(path);
    this.parent = parent;
    this.ends = ends; // to tie off to the next node after the entire option list
    this.continues = []; // to tie off to the next option
    this.question = '';
    this.answer = '';
    this.position = 0;
    Object.seal(this);
}

Option.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'text' && this.position === 0) {
        this.answer += space + text;
        return this;
    } else if (type === 'token' && text === '[' && this.position === 0) {
        this.position = 1;
        return this;
    } else if (type === 'text' && this.position === 1) {
        this.question += space + text;
        return this;
    } else if (type === 'token' && text === ']' && this.position === 1) {
        this.position = 2;
        return this;
    } else if (type === 'text' && this.position === 2) {
        this.question += space + text;
        this.answer += text;
        this.position = 3;
        return this;
    } else if (type === 'text' && this.position === 3) {
        this.question += space + text;
        this.answer += space + text;
        return this;
    } else if (this.position === 0) {
        return this.create(this.answer, '', type, space, text, scanner);
    } else if (this.position === 1) {
        throw new Error('expected matching ]');
    } else if (this.position === 2 || this.position === 3) {
        return this.create(this.question, this.answer, type, space, text, scanner);
    }
};

Option.prototype.create = function create(question, answer, type, space, text, scanner) {
    var variable = Path.toName(this.path);
    var path = this.path;

    if (this.leader === '*') {
        var jnz = this.story.create(path, 'jnz', variable);
        var jnzBranch = new Branch(jnz);
        this.continues.push(jnzBranch);
        path = Path.firstChild(path);
        tie([jnz], path);
    }

    var option = this.story.create(path, 'option', question);
    this.continues.push(option);

    if (this.leader === '*') {
        path = Path.next(path);
    } else {
        path = Path.firstChild(path);
    }

    var prev = new Branch(option);
    var next;

    if (this.leader === '*') {
        next = this.story.create(path, 'inc', variable);
        tie([prev], path);
        path = Path.next(path);
        prev = next;
    }

    if (answer) {
        next = this.story.create(path, 'text', answer);
        tie([prev], path);
        path = Path.next(path);
        prev = next;
    }

    return new Knot(this.story, path, this, [prev]).next(type, space, text, scanner);
};

Option.prototype.return = function _return(path, ends, scanner) {
    return new MaybeOption(this.story, Path.next(this.path), this.parent, this.continues, this.ends.concat(ends));
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
        tie(this.continues, this.path);
        var prompt = this.story.create(this.path, 'prompt');
        return this.parent.return(Path.next(this.path), this.ends, scanner).next(type, '', text, scanner);
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
        var label = new Label(this.story, [text, 0], this.parent);
        return new Knot(this.story, [text, 0], label, this.ends.concat([label]));
    } else {
        // TODO produce a readable error using scanner
        throw new Error('expected label after =');
    }
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
        // TODO consider placing a guard here/somewhere to ensure that the
        // following route is traversable if further states are added.
        return new Knot(this.story, Path.next(this.path), this.parent, []);
    } else {
        throw new Error('Unexpected token after goto arrow: ' + type + ' ' + text + ' ' + scanner.position());
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
