// An interface for building excerpts and writing them to a stream.
// The stream must have the interface of the line wrapper.
'use strict';

class Excerpt {
    constructor() {
        this.children = [];
        this.flag = false;
    }

    Child = Paragraph;

    paragraph() {
        this.flag = true;
    }

    break() {
        if (this.children.length === 0) {
            return;
        }
        var last = this.children[this.children.length - 1];
        last.break();
    }

    startJoin(lift, delimiter, conjunction) {
        if (this.children.length === 0) {
            return;
        }
        var last = this.children[this.children.length - 1];
        last.startJoin(lift, delimiter, conjunction);
    }

    delimit(delimiter) {
        if (this.children.length === 0) {
            return;
        }
        var last = this.children[this.children.length - 1];
        last.delimit(delimiter);
    }

    stopJoin() {
        if (this.children.length === 0) {
            return;
        }
        var last = this.children[this.children.length - 1];
        last.stopJoin();
    }

    digest(lift, words, drop) {
        if (typeof words === 'string') {
            words = words.split(' ');
        }
        if (this.children.length === 0 || this.flag) {
            this.children.push(new this.Child());
            this.flag = false;
        }
        var last = this.children[this.children.length - 1];
        last.digest(lift, words, drop);
    }

    write(wrapper) {
        for (var i = 0; i < this.children.length; i++) {
            if (i > 0) {
                wrapper.break();
            }
            this.children[i].write(wrapper);
        }
    }
}

module.exports = Excerpt;

class Paragraph {
    constructor() {
        this.children = [];
        this.flag = false;
    }

    Child = Stanza;

    break() {
        this.flag = true;
    }

    startJoin = Excerpt.prototype.startJoin;
    delimit = Excerpt.prototype.delimit;
    stopJoin = Excerpt.prototype.stopJoin;
    digest = Excerpt.prototype.digest;

    write(wrapper) {
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].write(wrapper);
        }
    }
}

class Stanza {
    constructor() {
        this.children = [];
        this.lift = false;
        this.empty = true;
        this.cursor = new StanzaProxy(this);
    }

    startJoin(lift, delimiter, conjunction) {
        this.cursor = this.cursor.startJoin(lift, delimiter, conjunction);
    }

    delimit(delimiter) {
        this.cursor.delimit(delimiter);
    }

    stopJoin() {
        this.cursor = this.cursor.stopJoin();
    }

    digest(lift, words, drop) {
        this.cursor.digest(lift, words, drop);
    }

    write(wrapper) {
        for (var i = 0; i < this.children.length; i++) {
            wrapper.word(this.children[i]);
        }
        wrapper.break();
    }

    proxyDigest(lift, words, drop) {
        lift = this.lift || lift;
        var i = 0;
        if (!lift && words.length && this.children.length) {
            this.children[this.children.length - 1] += words[i++];
        }
        for (; i < words.length; i++) {
            this.children.push(words[i]);
        }
        this.lift = drop;
        this.empty = false;
    }
}

class StanzaProxy {
    constructor(parent) {
        this.parent = parent;
    }

    startJoin(lift, delimiter, conjunction) {
        return new Conjunction(this, lift, delimiter, conjunction);
    }

    delimit(delimiter) {
        this.parent.digest('', [delimiter], ' ');
    }

    stopJoin() {
        throw new Error('cannot stop without starting conjunction');
    }

    digest(lift, words, drop) {
        this.parent.proxyDigest(lift, words, drop);
    }
}

class Conjunction {
    constructor(parent, lift, delimiter, conjunction) {
        this.children = [];
        this.parent = parent;
        this.lift = lift;
        this.delimiter = delimiter;
        this.conjunction = conjunction;
    }

    Child = Stanza;

    delimit() {
        this.flag = true;
    }

    digest = Excerpt.prototype.digest;

    startJoin = StanzaProxy.prototype.startJoin;

    stopJoin(drop) {
        if (this.children.length === 0) {
            // noop
        } else if (this.children.length === 1) {
            this.parent.digest(this.lift, this.children[0].children, drop);
        } else if (this.children.length === 2) {
            this.parent.digest(this.lift, this.children[0].children, '');
            this.parent.digest(' ', [this.conjunction], ' ');
            this.parent.digest(' ', this.children[1].children, drop);
        } else {
            for (var i = 0; i < this.children.length - 1; i++) {
                this.parent.digest('', this.children[i].children, '');
                this.parent.digest('', [this.delimiter], ' ');
            }
            this.parent.digest('', [this.conjunction], ' ');
            this.parent.digest('', this.children[i].children, '');
        }
        return this.parent;
    }
}
