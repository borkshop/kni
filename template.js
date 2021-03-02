'use strict';

const Engine = require('./engine');
const story = require('./story.json');
const Document = require('./document');

const handler = {
    waypoint(waypoint) {
        const json = JSON.stringify(waypoint);
        window.history.pushState(waypoint, '', '#' + btoa(json));
        localStorage.setItem('kni', json);
    },
    goto(label) {
        console.log(label);
    },
    answer(text) {
        console.log('>', text);
    },
};

const doc = new Document(document.body);

const engine = new Engine({
    story: story,
    render: doc,
    dialog: doc,
    handler,
});

window.onpopstate = (event) => {
    console.log('> back');
    engine.resume(event.state);
};

window.onkeypress = (event) => {
    const code = event.code;
    const match = /^Digit(\d+)$/.exec(code);
    if (match) {
        engine.answer(match[1]);
    } else if (code === 'KeyR') {
        engine.reset();
    }
};

const reset = document.querySelector(".reset");
if (reset) {
    reset.onclick = () => { engine.reset() };
}

doc.clear();

let waypoint = window.location.hash || null;
let json = localStorage.getItem('kni');
if (waypoint) {
    try {
        waypoint = atob(waypoint.slice(1));
        waypoint = JSON.parse(waypoint);
    } catch (error) {
        console.error(error);
        waypoint = null;
    }
} else if (json) {
    try {
        waypoint = JSON.parse(json);
    } catch (error) {
        console.error(error);
        waypoint = null;
    }
    window.history.replaceState(waypoint, '', '#' + btoa(json));
}

engine.resume(waypoint);
