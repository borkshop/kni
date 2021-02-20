'use strict';

var Path = require('./path');

module.exports = class Scope {
    static tie(ends, name) {
        for (var i = 0; i < ends.length; i++) {
            var end = ends[i];
            if (end.type === 'branch') {
                end.node.branch = name;
            } else {
                end.next = name;
            }
        }
    }

    constructor(story, path, base) {
        this.story = story;
        this.path = path;
        this.base = base;
        Object.seal(this);
    }

    name() {
        return Path.toName(this.path);
    }

    create(type, arg, position) {
        return this.story.create(this.path, type, arg, position);
    }

    next() {
        return new Scope(this.story, Path.next(this.path), this.base);
    }

    zerothChild() {
        return new Scope(this.story, Path.zerothChild(this.path), this.base);
    }

    firstChild() {
        return new Scope(this.story, Path.firstChild(this.path), this.base);
    }

    label(label) {
        return new Scope(this.story, this.base.concat([label, 0]), this.base);
    }

    tie(nodes) {
        Scope.tie(nodes, this.name());
    }

    // istanbul ignore next
    error(message) {
        this.story.error(message);
    }
}
