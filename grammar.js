'use strict';

var story = require('./story');

exports.start = start;

function start() {
    return new Knot(['start', 0], new Start());
}

function Start() {
    this.type = 'start';
    this.parent = null;
    this.prev = null;
}

Start.prototype.return = function _return(prev) {
    return new End(this, prev);
};

function End(parent, prev) {
    this.type = 'end';
    this.parent = parent;
    this.prev = prev;
}

End.prototype.next = function next(type, text) {
    throw new Error('nodes beyond root');
};

function Knot(path, parent, prev) {
    this.type = 'knot';
    this.path = path;
    this.parent = parent;
    this.prev = prev;
}

Knot.prototype.next = function next(type, text) {
    if (type === 'stop') {
        return this.parent.return(this.prev);
    } else if (type === 'start') {
        return new MaybeOption(firstChildPath(this.path), this, this.prev, []).next(type, text);
    } else if (type === 'break') {
        return new Knot(nextPath(this.path), this.parent, new story.Break(pathToName(this.path), this.prev));
    } else if (type === 'text') {
        return new Knot(nextPath(this.path), this.parent, new story.Text(pathToName(this.path), text, this.prev));
    } else {
        throw new Error('nope ' + type);
    }
};

Knot.prototype.return = function _return(prev) {
    return new Knot(nextPath(this.path), this.parent, prev);
};

function Option(path, parent, prev, ends) {
    this.path = path;
    this.parent = parent;
    this.prev = prev;
    this.ends = ends;
    this.option = null;
}

Option.prototype.next = function next(type, text) {
    if (type === 'text') {
        this.option = new story.Option(pathToName(this.path), text, this.prev, this.ends);
        return new Knot(firstChildPath(this.path), this);
    } else {
        throw new Error('nope');
    }
};

Option.prototype.return = function _return(prev) {
    return new MaybeOption(nextPath(this.path), this.parent, this.option, this.ends.concat([prev]));
};

function MaybeOption(path, parent, prev, ends) {
    this.parent = parent;
    this.prev = prev;
    this.ends = ends;
    this.path = path;
}

MaybeOption.prototype.next = function next(type, text) {
    if (type === 'start') {
        return new Option(this.path, this.parent, this.prev, this.ends);
    } else {
        return this.parent.return(new story.Options(pathToName(this.path), this.ends, this.prev));
    }
};

MaybeOption.prototype.return = function _return(prev) {
    return new Knot(nextPath(this.path), this.parent, prev);
};

function pathToName(path) {
    var name = path[0];
    var i;
    for (i = 1; i < path.length - 1; i++) {
        name += '.' + path[i];
    }
    var last = path[i];
    if (last !== 0) {
        name += '.' + last;
    }
    return name;
}

function nextPath(path) {
    path = path.slice();
    path[path.length - 1]++;
    return path;
}

function firstChildPath(path) {
    path = path.slice();
    path.push(1);
    return path;
}
