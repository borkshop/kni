'use strict';

const Engine = require('./engine');
const story = require('./story.json');
const Document = require('./document');

const handler = {
    load() {
        if (window.location.hash.length > 1) {
            const json = atob(window.location.hash.slice(1));
            return JSON.parse(json);
        }
        const json = window.localStorage.getItem('kni');
        if (json) {
            const state = JSON.parse(json);
            window.history.replaceState(state, '', '#' + btoa(json));
            return state;
        }
        return null;
    },
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

try {
    engine.resume(handler.load());
} catch (error) {
    console.error('unable to load prior state, restarting', error);
    engine.resume(null);
}
