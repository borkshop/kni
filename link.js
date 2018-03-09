'use strict';

module.exports = link;

function link(story) {
    var labels = Object.keys(story.states);
    for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        var state = story.states[label];

        var link = linker(story, label, state);

        if (state.next != null) {
            state.next = link('next')(state.next);
        }
        if (state.branch != null) {
            state.branch = link('branch')(state.branch);
        }
        if (state.question != null) {
            state.question = state.question.map(link('question'));
        }
        if (state.answer != null) {
            state.answer = state.answer.map(link('answer'));
        }
    }
}

function linker(story, context, state) {
    var parts = context.split('.');
    var ancestry = [];
    while (parts.length > 0) {
        ancestry.push(parts.slice());
        parts.pop();
    }
    ancestry.push([]);
    return function (role) {
        return function (label) {
            if (label === 'RET' || label === 'ESC') {
                return label;
            }
            for (var i = 0; i < ancestry.length; i++) {
                var candidate = ancestry[i].slice();
                candidate.push(label);
                candidate = candidate.join('.');
                if (story.states[candidate] != null) {
                    return candidate;
                }
            }
            // istanbul ignore next
            story.error('Could not link ' + role + ' label ' + JSON.stringify(label) + ' at position ' + state.position);
            // istanbul ignore next
            return label;
        };
    };
}
