'use strict';

var Path = require('./path');

exports.Break = Break;

function Break(path, prev) {
    this.type = 'break';
    this.path = path;
    this.name = Path.toName(path);
    this.prev = prev;
}

Break.prototype.write = function write(story, next) {
    if (this.prev) {
        this.prev.write(story, this.name);
    }
    story[this.name] = {
        type: 'break',
        next: next
    };
};

// istanbul ignore next
Break.prototype.inline = function inline() {
    var line = this.name + ':break';
    if (this.prev) {
        line += ' <- ' + this.prev.inline();
    }
    return line;
};

exports.Text = Text;

function Text(path, text, prev) {
    this.type = 'text';
    this.path = path;
    this.name = Path.toName(path);
    this.text = text;
    this.prev = prev;
}

Text.prototype.write = function write(story, next) {
    if (this.prev) {
        this.prev.write(story, this.name);
    }
    story[this.name] = {
        type: 'text',
        text: this.text,
        next: next
    };
};

// istanbul ignore next
Text.prototype.inline = function inline() {
    var line = this.name + ':text(' + JSON.stringify(this.text.slice(0, 10)) + ')';
    if (this.prev) {
        line += ' <- ' + this.prev.inline();
    }
    return line;
};

exports.Option = Option;

function Option(path, text, prev) {
    this.type = 'option';
    this.path = path;
    this.name = Path.toName(path);
    this.text = text;
    this.prev = prev;
    this.branch = null;
}

Option.prototype.write = function write(story, next) {
    if (!this.branch) {
        this.branch = next;
    } else {
        if (this.prev) {
            this.prev.write(story, this.name);
        }
        story[this.name] = {
            type: 'option',
            label: this.text,
            keywords: [],
            branch: this.branch,
            next: next
        };
    }
};

// istanbul ignore next
Option.prototype.inline = function inline() {
    var line = this.name + ':option(';
    if (this.branch) {
        line += this.branch;
    }
    line += ')';
    if (this.prev) {
        line += ' <- ' + this.prev.inline();
    }
    return line;
};

exports.Options = Options;

function Options(path, ends, prev) {
    this.type = 'options';
    this.path = path;
    this.name = Path.toName(path);
    this.ends = ends;
    this.prev = prev;
}

Options.prototype.write = function write(story, next) {
    // write ends before prev to populate branches
    for (var i = 0; i < this.ends.length; i++) {
        var end = this.ends[i];
        end.write(story, next);
    }

    this.prev.write(story, this.name);

    story[this.name] = {
        type: 'prompt'
    };
};

// istanbul ignore next
Options.prototype.inline = function inline() {
    var line = this.name + ':prompt(';
    for (var i = 0; i < this.ends.length; i++) {
        if (i !== 0) {
            line += ', ';
        }
        var end = this.ends[i];
        line += end.name;
        // end.write(story, next);
    }
    line += ')';
    if (this.prev) {
        line += ' <- ' + this.prev.inline();
    }
    return line;
};

exports.Goto = Goto;

function Goto(path, label, prev) {
    this.type = 'goto';
    this.path = path;
    this.name = Path.toName(path);
    this.label = label;
    this.prev = prev;
}

Goto.prototype.write = function write(story, next) {
    if (this.prev) {
        this.prev.write(story, this.name);
    }

    story[this.name] = {
        type: 'goto',
        label: this.label
    };
};

// istanbul ignore next
Goto.prototype.inline = function inline() {
    var line = this.name + ':goto';
    if (this.prev) {
        line += ' <- ' + this.prev.inline();
    }
    return line;
};
