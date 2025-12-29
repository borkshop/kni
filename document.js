/** @import { default as Engine } from './engine' */

const linkMatcher = /\s*(\w+:\/\/\S+)$/;

/**
 * @typedef {object} DocumentOptions
 * @prop {((doc: globalThis.Document, self: Document) => void)} [createPage]
 * @prop {HTMLElement} [meterFaultButton]
 * @prop {'log' | 'remove' | 'fade'} [pageTurnBehavior]
 */

export default class Document {
  /**
   * @param {HTMLElement} element
   * @param {DocumentOptions} [options]
   */
  constructor(element, options = {}) {
    const {
      createPage = undefined,
      meterFaultButton = undefined,
      pageTurnBehavior = 'log',
    } = options;

    const self = this;
    this.document = /** @type {globalThis.Document} */ (element.ownerDocument);
    this.parent = element;
    /** @type {HTMLElement | null} */
    this.frame = null;
    /** @type {HTMLElement | null} */
    this.body = null;
    /** @type {HTMLElement | null} */
    this.afterBody = null;
    /** @type {Engine | undefined} */
    this.engine = undefined;
    this.carry = '';
    /** @type {HTMLElement | null} */
    this.cursor = null;
    /** @type {HTMLElement | null} */
    this.cursorParent = null;
    /** @type {HTMLElement | null} */
    this.afterCursor = null;
    /** @type {string | null} */
    this.next = null;
    this.optionIndex = 0;
    /** @type {HTMLTableElement | null} */
    this.options = null;
    this.p = false;
    this.br = false;
    /** @type {(event: MouseEvent) => void} */
    this.onclick = event => {
      const target = /** @type {HTMLElement & {number?: number}} */ (event.target);
      if (target.number != null) {
        self.answer(target.number);
      }
    };
    /** @type {((doc: globalThis.Document, self: Document) => void) | undefined} */
    this.customCreatePage = createPage;
    this.meterFaultButton = meterFaultButton;
    this.pageTurnBehavior = pageTurnBehavior;

    Object.seal(this);
  }

  /**
   * @param {string} lift
   * @param {string} text
   * @param {string} drop
   */
  write(lift, text, drop) {
    const document = this.document;
    lift = this.carry || lift;
    if (this.p && this.cursorParent) {
      this.cursor = document.createElement('p');
      this.cursorParent.insertBefore(this.cursor, this.afterCursor);
      this.p = false;
      this.br = false;
      lift = '';
    }
    if (!this.cursor) {
      throw new Error('write called before cursor initialized');
    }
    if (this.br) {
      this.cursor.appendChild(document.createElement('br'));
      this.br = false;
      lift = '';
    }
    const match = linkMatcher.exec(text);
    if (match === null) {
      // TODO merge with prior text node
      this.cursor.appendChild(document.createTextNode(lift + text));
    } else {
      // Support a hyperlink convention.
      if (lift !== '') {
        this.cursor.appendChild(document.createTextNode(lift));
      }
      const link = document.createElement('a');
      link.href = match[1];
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.appendChild(document.createTextNode(text.slice(0, match.index)));
      this.cursor.appendChild(link);
    }
    this.carry = drop;
  }

  break() {
    this.br = true;
  }

  paragraph() {
    this.p = true;
  }

  startOption() {
    this.optionIndex++;
    const document = this.document;
    const tr = document.createElement('tr');
    if (this.options) {
      this.options.appendChild(tr);
    }
    const th = document.createElement('th');
    tr.appendChild(th);
    th.innerText = `${this.optionIndex}.`;
    const td = /** @type {HTMLTableCellElement & {number?: number}} */ (
      document.createElement('td')
    );
    td.number = this.optionIndex;
    td.onclick = /** @type {(event: MouseEvent) => void} */ (this.onclick);
    td.setAttribute('aria-role', 'button');
    tr.appendChild(td);
    this.cursor = td;
    this.p = false;
    this.br = false;
    this.carry = '';
  }

  stopOption() {
    this.p = false;
    this.br = false;
  }

  flush() {
    // No-op (for console only)
  }

  pardon() {
    // No-op (for console only)
  }

  display() {
    if (!this.frame) {
      throw new Error('display called before frame initialized');
    }
    this.frame.style.opacity = '0';
    this.frame.style.transform = 'translateX(2ex)';
    this.parent.appendChild(this.frame);

    // TODO not this
    const frame = this.frame;
    setTimeout(() => {
      frame.style.opacity = '1';
      frame.style.transform = 'translateX(0)';
    }, 10);
  }

  clear() {
    if (this.frame) {
      if (this.pageTurnBehavior === 'log') {
        if (this.options) {
          this.options.remove();
        }
      } else if (this.pageTurnBehavior === 'remove') {
        this.frame.remove();
      } else if (this.pageTurnBehavior === 'fade') {
        this.frame.style.opacity = '0';
        this.frame.style.transform = 'translateX(-2ex)';
        this.frame.addEventListener('transitionend', this);
      }
    }
    (this.customCreatePage || this.createPage)(this.document, this);
    this.cursor = null;
    this.cursorParent = this.body;
    this.afterCursor = this.afterBody;
    this.br = false;
    this.p = true;
    this.carry = '';
    this.optionIndex = 0;
  }

  /**
   * @param {globalThis.Document} document
   * @param {Document} self
   */
  createPage(document, self) {
    self.frame = document.createElement('div');
    self.frame.classList.add('kni-frame');
    self.frame.style.opacity = '0';

    const A = document.createElement('div');
    A.classList.add('kni-frame-a');
    self.frame.appendChild(A);

    const B = document.createElement('div');
    B.classList.add('kni-frame-b');
    A.appendChild(B);

    const C = document.createElement('div');
    C.classList.add('kni-frame-c');
    B.appendChild(C);

    self.body = document.createElement('div');
    self.body.classList.add('kni-body');
    C.appendChild(self.body);

    self.options = document.createElement('table');
    self.body.appendChild(self.options);
    self.afterBody = self.options;
  }

  /**
   * @param {Event} event
   */
  handleEvent(event) {
    // transitionend on this.frame, only
    const target = /** @type {HTMLElement} */ (event.target);
    target.remove();
  }

  meterFault() {
    if (this.meterFaultButton && this.body) {
      this.body.appendChild(this.meterFaultButton);
    }
  }

  /**
   * @param {string} [_cue]
   */
  ask(_cue) {}

  /**
   * @param {string | number} text
   */
  answer(text) {
    if (this.engine) {
      this.engine.answer(text);
    }
  }

  close() {}
}
