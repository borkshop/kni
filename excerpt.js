// An interface for building excerpts and writing them to a stream.
// The stream must have the interface of the line wrapper.
'use strict';

module.exports = Excerpt;

function Excerpt() {
    this.children = [];
    this.flag = false;
}

Excerpt.prototype.Child = Paragraph;
Excerpt.prototype.paragraph = flag;
Excerpt.prototype.break = breakChild;

// istanbul ignore next
Excerpt.prototype.startJoin = function startJoin(lift, delimiter, conjunction) {
    if (this.children.length === 0) {
        return;
    }
    var last = this.children[this.children.length - 1];
    last.startJoin(lift, delimiter, conjunction);
};

// istanbul ignore next
Excerpt.prototype.delimit = function delimit(delimiter) {
    if (this.children.length === 0) {
        return;
    }
    var last = this.children[this.children.length - 1];
    last.delimit(delimiter);
};

// istanbul ignore next
Excerpt.prototype.stopJoin = function stopJoin() {
    if (this.children.length === 0) {
        return;
    }
    var last = this.children[this.children.length - 1];
    last.stopJoin();
};

Excerpt.prototype.digest = function digest(lift, words, drop) {
    if (typeof words === 'string') {
        words = words.split(' ');
    }
    if (this.children.length === 0 || this.flag) {
        this.children.push(new this.Child());
        this.flag = false;
    }
    var last = this.children[this.children.length - 1];
    last.digest(lift, words, drop);
};

Excerpt.prototype.write = function write(wrapper) {
    for (var i = 0; i < this.children.length; i++) {
        if (i > 0) {
            wrapper.break();
        }
        this.children[i].write(wrapper);
    }
};

function Paragraph() {
    this.children = [];
    this.flag = false;
}

Paragraph.prototype.Child = Stanza;
Paragraph.prototype.break = flag;
Paragraph.prototype.startJoin = Excerpt.prototype.startJoin;
Paragraph.prototype.delimit = Excerpt.prototype.delimit;
Paragraph.prototype.stopJoin = Excerpt.prototype.stopJoin;
Paragraph.prototype.digest = Excerpt.prototype.digest;

Paragraph.prototype.write = function write(wrapper) {
    for (var i = 0; i < this.children.length; i++) {
        this.children[i].write(wrapper);
    }
};

function Stanza() {
    this.children = [];
    this.lift = false;
    this.empty = true;
    this.cursor = new StanzaProxy(this);
}

// istanbul ignore next
Stanza.prototype.startJoin = function startJoin(lift, delimiter, conjunction) {
    this.cursor = this.cursor.startJoin(lift, delimiter, conjunction);
};

// istanbul ignore next
Stanza.prototype.delimit = function delimit(delimiter) {
    this.cursor.delimit(delimiter);
};

// istanbul ignore next
Stanza.prototype.stopJoin = function stopJoin() {
    this.cursor = this.cursor.stopJoin();
};

Stanza.prototype.digest = function digest(lift, words, drop) {
    this.cursor.digest(lift, words, drop);
};

Stanza.prototype.write = function write(wrapper) {
    for (var i = 0; i < this.children.length; i++) {
        wrapper.word(this.children[i]);
    }
    wrapper.break();
};

Stanza.prototype.proxyDigest = function proxyDigest(lift, words, drop) {
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
};

function StanzaProxy(parent) {
    this.parent = parent;
}

// istanbul ignore next
StanzaProxy.prototype.startJoin = function startJoin(lift, delimiter, conjunction) {
    return new Conjunction(this, lift, delimiter, conjunction);
};

// istanbul ignore next
StanzaProxy.prototype.delimit = function delimit(delimiter) {
    this.parent.digest('', [delimiter], ' ');
};

// istanbul ignore next
StanzaProxy.prototype.stopJoin = function stopJoin() {
    throw new Error('cannot stop without starting conjunction');
};

StanzaProxy.prototype.digest = function digest(lift, words, drop) {
    this.parent.proxyDigest(lift, words, drop);
};

// istanbul ignore next
function Conjunction(parent, lift, delimiter, conjunction) {
    this.children = [];
    this.parent = parent;
    this.lift = lift;
    this.delimiter = delimiter;
    this.conjunction = conjunction;
}

Conjunction.prototype.Child = Stanza;
Conjunction.prototype.delimit = flag;
Conjunction.prototype.digest = Excerpt.prototype.digest;

Conjunction.prototype.startJoin = StanzaProxy.prototype.startJoin;

// istanbul ignore next
Conjunction.prototype.stopJoin = function stopJoin(drop) {
    if (this.children.length === 0) {
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
};

function flag() {
    this.flag = true;
}

function breakChild() {
    // istanbul ignore next
    if (this.children.length === 0) {
        return;
    }
    var last = this.children[this.children.length - 1];
    last.break();
};
