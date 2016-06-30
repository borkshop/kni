'use strict';
var Engine = require('./engine');
var story = require('./examples/archery.json');
var Document = require('./document');
var LocalStorage = require('./localstorage');
var doc = new Document(document.getElementById('body'));
var engine = new Engine({
    story: story,
    render: doc,
    dialog: doc,
    storage: new LocalStorage(localStorage)
});
doc.clear();
engine.continue();

window.onkeypress = function onkeypress(event) {
    var key = event.code;
    var match = /^Digit(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    }
};
