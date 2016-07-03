'use strict';
var Engine = require('./engine');
var story = require('./examples/archery.json');
var Story = require('./story');
var Document = require('./document');
var LocalStorage = require('./localstorage');
var doc = new Document(document.body);
var engine = new Engine({
    story: story,
    render: doc,
    dialog: doc,
    storage: new LocalStorage(localStorage)
});
engine.end = function end() {
    this.options.push({
        'label': 'Once more from the top…',
        'branch': 'start'
    });
    return this.$prompt();
};
doc.clear();
engine.continue();

window.onkeypress = function onkeypress(event) {
    var key = event.code;
    var match = /^Digit(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    }
};
