'use strict';
var Hash = require('hashbind');
var Engine = require('./engine');
var story = require('./examples/archery.json');
var Story = require('./story');
var Document = require('./document');

var hash = new Hash(window);

var reset = document.querySelector(".reset")
reset.onclick = function onclick() {
    engine.restore(null);
};

var doc = new Document(document.body);
var engine = new Engine({
    story: story,
    render: doc,
    dialog: doc
});
engine.end = function end() {
    this.options.push({
        'label': 'Once more from the top…',
        'branch': 'start'
    });
    return this.$ask();
};
engine.handleWaypoint = function handleWaypoint(waypoint) {
    var json = JSON.stringify(waypoint);
    var encoded = btoa(json);
    hash.set('waypoint', encoded);
    localStorage.setItem('archery.ink', json);
};
doc.clear();

var waypoint;
if (waypoint = hash.get('waypoint')) {
    try {
        waypoint = atob(waypoint);
        waypoint = JSON.parse(waypoint);
    } catch (error) {
        waypoint = null;
    }
} else if (waypoint = localStorage.getItem('archery.ink')) {
    hash.set('waypoint', btoa(waypoint));
    try {
        waypoint = JSON.parse(waypoint);
    } catch (error) {
        waypoint = null;
    }
}

if (waypoint) {
    engine.restore(waypoint);
} else {
    engine.continue();
}

window.onkeypress = function onkeypress(event) {
    var key = event.code;
    var match = /^Digit(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    } else if (key === 'KeyR') {
        engine.restore(null);
    }
};
