'use strict';

exports.GetDynamicVariable = GetDynamicVariable;
exports.GetStaticVariable = GetStaticVariable;

function GetDynamicVariable(story, parent, literals, variables) {
    this.type = 'dynamic-variable';
    this.story = story;
    this.parent = parent;
    this.literals = literals;
    this.variables = variables;
    this.variable = '';
    Object.seal(this);
}

GetDynamicVariable.prototype.next = function next(type, space, text, scanner) {
    if ((type ===  'alphanum' || type === 'number') && space === '') {
        this.variable += text;
        return this;
    }
    return new GetStaticVariable(this.story, this.parent, this.literals, this.variables.concat([this.variable]), '')
        .next(type, space, text, scanner);
};

function GetStaticVariable(story, parent, literals, variables, literal, fresh) {
    this.type = 'static-variable';
    this.story = story;
    this.parent = parent;
    this.literals = literals;
    this.variables = variables;
    this.literal = literal;
    this.fresh = fresh;
    Object.seal(this);
}

GetStaticVariable.prototype.next = function next(type, space, text, scanner) {
    if (space === '' || this.fresh) {
        this.fresh = false;
        if (text === '$') {
            return new GetDynamicVariable(
                this.story,
                this.parent,
                this.literals.concat([this.literal]),
                this.variables
            );
        } else if (text === '.') {
            this.literal += text;
            return this;
        } else if (type === 'alphanum' || type === 'number') {
            this.literal += text;
            return this;
        }
    }

    var state;
    if (this.literals.length === 0 && this.variables.length === 0) {
        // istanbul ignore if
        if (this.literal === '') {
            this.story.error('Expected variable but got ' + type + '/' + text + ' at ' + scanner.position());
            state = this.parent.return([], scanner);
        } else {
            state = this.parent.return(['get', this.literal], scanner);
        }
    } else {
        state = this.parent.return(['var', this.literals.concat([this.literal]), this.variables], scanner);
    }
    return state.next(type, space, text, scanner);
};

