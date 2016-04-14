
exports.Break = Break;

function Break(name, prev) {
    this.type = 'break';
    this.name = name;
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

exports.Text = Text;

function Text(name, text, prev) {
    this.type = 'text';
    this.name = name;
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

exports.Option = Option;

function Option(name, text, prev) {
    this.type = 'option';
    this.name = name;
    this.text = text;
    this.prev = prev;
}

Option.prototype.write = function write(story, next) {
    if (this.prev) {
        this.prev.write(story, this.name);
    }
    story[this.name] = {
        type: 'option',
        label: this.text,
        keywords: [],
        branch: this.name + '.1',
        next: next
    };
};

exports.Options = Options;

function Options(name, ends, prev) {
    this.type = 'options';
    this.name = name;
    this.ends = ends;
    this.prev = prev;
}

Options.prototype.write = function write(story, next) {
    if (this.prev) {
        this.prev.write(story, this.name);
    }
    for (var i = 0; i < this.ends.length; i++) {
        var end = this.ends[i];
        end.write(story, next);
    }
    story[this.name] = {
        type: 'prompt'
    };
};
