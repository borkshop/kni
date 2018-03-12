'use strict';

var Path = require('./path');

module.exports = Scope;

function Scope(story, path, base) {
    this.story = story;
    this.path = path;
    this.base = base;
    Object.seal(this);
}

Scope.prototype.name = function name() {
    return Path.toName(this.path);
};

Scope.prototype.create = function create(type, arg, position) {
    return this.story.create(this.path, type, arg, position);
};

Scope.prototype.next = function next() {
    return new Scope(this.story, Path.next(this.path), this.base);
};

Scope.prototype.zerothChild = function zerothChild() {
    return new Scope(this.story, Path.zerothChild(this.path), this.base);
};

Scope.prototype.firstChild = function firstChild() {
    return new Scope(this.story, Path.firstChild(this.path), this.base);
};

Scope.prototype.label = function label(label) {
    return new Scope(this.story, this.base.concat([label, 0]), this.base);
};

Scope.prototype.tie = function _tie(nodes) {
    tie(nodes, this.name());
};

// istanbul ignore next
Scope.prototype.error = function (message) {
    this.story.error(message);
};

Scope.tie = tie;
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
