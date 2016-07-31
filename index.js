'use strict';
var Engine = require('./engine');
var story = require('./examples/archery.json');
var Story = require('./story');
var Document = require('./document');

var reset = document.querySelector(".reset");
reset.onclick = function onclick() {
    engine.resume();
};

var doc = new Document(document.body);
var engine = new Engine({
    story: story,
    render: doc,
    dialog: doc,
    handler: {
        waypoint: function waypoint(waypoint) {
            var json = JSON.stringify(waypoint);
            window.history.pushState(waypoint, '', '#' + btoa(json));
            localStorage.setItem('archery.kni', json);
        },
        goto: function _goto(label) {
            console.log(label);
        },
        answer: function answer(text) {
            console.log('>', text);
        }
    }
});

doc.clear();

var waypoint;
var json;
if (waypoint = window.location.hash || null) {
    try {
        waypoint = atob(waypoint.slice(1));
        waypoint = JSON.parse(waypoint);
    } catch (error) {
        console.error(error);
        waypoint = null;
    }
} else if (json = localStorage.getItem('archery.kni')) {
    try {
        waypoint = JSON.parse(json);
    } catch (error) {
        console.error(error);
        waypoint = null;
    }
    window.history.replaceState(waypoint, '', '#' + btoa(json));
}

window.onpopstate = function onpopstate(event) {
    console.log('> back');
    engine.resume(event.state);
};

engine.resume(waypoint);

window.onkeypress = function onkeypress(event) {
    var key = event.code;
    var match = /^Digit(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    } else if (key === 'KeyR') {
        engine.resume();
    }
};
