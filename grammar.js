'use strict';

var Path = require('./path');
var story = require('./story');

exports.start = start;

function start(story) {
    return new Knot(story, ['start', 0], new Start(story), []);
}

function Start(story) {
    this.type = 'start';
    this.path = ['start'];
    this.story = story;
    Object.seal(this);
}

Start.prototype.return = function _return(path, ends, scanner) {
    if (path.length === 2 && path[0] === 'start' && path[1] === 0) {
        this.story.create(path, 'end');
    } else {
        this.story.create(['end'], 'end');
        tie(ends, ['end']);
    }
    return new End();
};

function End() {
    this.type = 'end';
    Object.seal(this);
}

// istanbul ignore next
End.prototype.next = function next(type, text, scanner) {
    throw new Error('nodes beyond root ' + type + ' ' + JSON.stringify(text));
};

function Knot(story, path, parent, ends) {
    this.type = 'knot';
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.story = story;
    Object.seal(this);
}

Knot.prototype.next = function next(type, text, scanner) {
    if (type === 'stop') {
        return this.parent.return(this.path, this.ends, scanner);
    } else if (type === 'text') {
        tie(this.ends, this.path);
        var text = this.story.create(this.path, 'text', text);
        return new Knot(this.story, Path.next(this.path), this.parent, [text]);
    } else if (type === 'start' && text === '+') {
        tie(this.ends, this.path);
        return new Option(this.story, this.path, this, []);
    } else if (type === 'start' && text === '-') {
        tie(this.ends, this.path);
        var node = this.story.create(this.path, 'break');
        return new Knot(this.story, Path.next(this.path), this, [node]);
    } else if (type === 'start' && text === '') {
        return new Knot(this.story, this.path, this, this.ends);
    } else if (type === 'break') {
        return this;
    } else if (type === 'token' && text === '=') {
        return new Label(this.story, this.path, this.parent, this.ends);
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

function Option(story, path, parent, ends) {
    this.type = 'option';
    this.story = story;
    this.path = path;
    this.name = Path.toName(path);
    this.parent = parent;
    this.ends = ends;
    this.option = null;
    this.question = '';
    this.answer = '';
    this.position = 0;
    Object.seal(this);
}

Option.prototype.next = function next(type, text, scanner) {
    // istanbul ignore else
    if (type === 'text' && this.position === 0) {
        this.answer += text;
        return this;
    } else if (type === 'token' && text === '[' && this.position === 0) {
        this.position = 1;
        return this;
    } else if (type === 'text' && this.position === 1) {
        this.question += text;
        return this;
    } else if (type === 'token' && text === ']' && this.position === 1) {
        this.position = 2;
        return this;
    } else if (type === 'text' && this.position === 2) {
        this.question += text;
        this.answer += text;
        return this;
    } else if (this.position === 0) {
        this.option = this.story.create(this.path, 'option', this.answer);
        this.option.tie(Path.toName(Path.next(this.path)));
        var branch = new Branch(this.option);
        return new Knot(this.story, Path.firstChild(this.path), this, [branch]).next(type, text);
    } else if (this.position === 1) {
        throw new Error('expected matching ]');
    } else if (this.position === 2) {
        this.option = this.story.create(this.path, 'option', this.question);
        this.option.tie(Path.toName(Path.next(this.path)));
        var branch = new Branch(this.option);
        var path = Path.firstChild(this.path);
        tie([branch], path);
        var answer = this.story.create(path, 'text', this.answer);
        return new Knot(this.story, Path.next(path), this, [answer]).next(type, text, scanner);
    }
};

Option.prototype.return = function _return(path, ends, scanner) {
    return new MaybeOption(this.story, Path.next(this.path), this.parent, this.option, this.ends.concat(ends));
};

function MaybeOption(story, path, parent, options, ends) {
    this.type = 'maybe-option';
    this.path = path;
    this.parent = parent;
    this.ends = ends;
    this.story = story;
    Object.seal(this);
}

MaybeOption.prototype.next = function next(type, text, scanner) {
    if (type === 'start' && text === '+') {
        return new Option(this.story, this.path, this.parent, this.ends);
    } else {
        var prompt = this.story.create(this.path, 'prompt');
        return this.parent.return(Path.next(this.path), this.ends, scanner).next(type, text, scanner);
    }
};

MaybeOption.prototype.return = function _return(prev, ends, scanner) {
    return new Knot(Path.next(this.path), this.parent, ends);
};

function Branch(option) {
    this.type = 'branch';
    this.option = option;
    Object.seal(this);
}

Branch.prototype.tie = function tie(path) {
    this.option.branch = path;
};

function Label(story, path, parent, ends) {
    this.type = 'label';
    this.story = story;
    this.path = path;
    this.parent = parent;
    this.ends = ends;
}

Label.prototype.next = function next(type, text, scanner) {
    if (type === 'text') {
        return readIdentifier(text, this);
    // istanbul ignore else
    } else if (type === 'identifier') {
        return new Knot(this.story, [text, 0], this.parent, this.ends);
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

Goto.prototype.next = function next(type, text, scanner) {
    if (type === 'text') {
        return readIdentifier(text, this);
    } else if (type === 'identifier') {
        tie(this.ends, this.path);
        this.story.create(this.path, 'goto', text);
        // TODO consider placing a guard here/somewhere to ensure that the
        // following route is traversable if further states are added.
        return new Knot(this.story, Path.next(this.path), this.parent, []);
    }
};

function readIdentifier(text, node, scanner) {
    var i = 0, c;
    // eat leading whitespace
    while (c = text[i], i < text.length && (c === ' ' || c === '\t')) {
        i++;
    }
    var start = i;
    while (c = text[i], i < text.length && c !== ' ' && c !== '\t') {
        i++;
    }
    var end = i;
    while (c = text[i], i < text.length && (c === ' ' || c === '\t')) {
        i++;
    }
    // istanbul ignore else
    if (start < end) {
        node = node.next('identifier', text.slice(start, end), scanner);
    }
    if (end < text.length) {
        node = node.next('text', text.slice(end + 1), scanner);
    }
    return node;
}

function tie(ends, next) {
    var name = Path.toName(next);
    for (var i = 0; i < ends.length; i++) {
        var end = ends[i];
        end.tie(name);
    }
}
