import Engine from './engine.js';
import Document from './document.js';
// @ts-ignore - virtual module provided by rollup
import story from 'virtual:story';

/** @type {Record<string, any>} */
const handler = {
  storageKey: 'kni',

  shouldLog: true,
  /**
   * @param {...any} args
   */
  log(...args) {
    if (this.shouldLog) {
      console.log(...args);
    }
  },

  /**
   * @returns {any}
   */
  load() {
    if (window.location.hash.length > 1) {
      const json = atob(window.location.hash.slice(1));
      return JSON.parse(json);
    }
    const json = window.localStorage.getItem(this.storageKey);
    if (json) {
      const state = JSON.parse(json);
      window.history.replaceState(state, '', `#${btoa(json)}`);
      return state;
    }
    return null;
  },
  /**
   * @param {any} waypoint
   */
  waypoint(waypoint) {
    const json = JSON.stringify(waypoint);
    window.history.pushState(waypoint, '', `#${btoa(json)}`);
    localStorage.setItem(this.storageKey, json);
  },
  /**
   * @param {string} label
   */
  goto(label) {
    this.log(label);
  },
  /**
   * @param {string} text
   */
  answer(text) {
    this.log('>', text);
  },
};

const meterFaultButton = document.createElement('a');
meterFaultButton.innerText = 'Continue…';
meterFaultButton.addEventListener('click', () => {
  engine.clearMeterFault();
});

const doc = new Document(document.body, {
  meterFaultButton,
  pageTurnBehavior: 'fade',
});

const engine = new Engine({
  story: story,
  render: doc,

  dialog: doc,
  handler,
});

window.onpopstate = event => {
  handler.log('>', 'back');
  engine.resume(event.state);
};

window.onkeypress = event => {
  const code = event.code;
  const match = /^Digit(\d+)$/.exec(code);
  if (match) {
    engine.answer(match[1]);
  } else if (code === 'KeyR') {
    engine.reset();
  }
};

const reset = document.querySelector('.reset');
if (reset) {
  /** @type {HTMLElement} */ (reset).onclick = () => {
    engine.reset();
  };
}

doc.clear();

try {
  engine.resume(handler.load());
} catch (error) {
  console.error('unable to load prior state, restarting', error);
  engine.resume(null);
}
