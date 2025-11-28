'use strict';

module.exports = class Document {
  constructor(element, createPage) {
    const self = this;
    this.document = element.ownerDocument;
    this.parent = element;
    this.frame = null;
    this.body = null;
    this.afterBody = null;
    this.engine = null;
    this.carry = '';
    this.cursor = null;
    this.cursorParent = null;
    this.afterCursor = null;
    this.next = null;
    this.optionIndex = 0;
    this.options = null;
    this.p = false;
    this.br = false;
    this.onclick = (event) => {
      self.answer(event.target.number);
    };
    this.createPage = createPage || this.createPage;
    Object.seal(this);
  }

  write(lift, text, drop) {
    const document = this.document;
    lift = this.carry || lift;
    if (this.p) {
      this.cursor = document.createElement('p');
      this.cursorParent.insertBefore(this.cursor, this.afterCursor);
      this.p = false;
      this.br = false;
      lift = '';
    }
    if (this.br) {
      this.cursor.appendChild(document.createElement('br'));
      this.br = false;
      lift = '';
    }
    // TODO merge with prior text node
    this.cursor.appendChild(document.createTextNode(lift + text));
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
    this.options.appendChild(tr);
    const th = document.createElement('th');
    tr.appendChild(th);
    th.innerText = this.optionIndex + '.';
    const td = document.createElement('td');
    td.number = this.optionIndex;
    td.onclick = this.onclick;
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
    this.frame.style.opacity = 0;
    this.frame.style.transform = 'translateX(2ex)';
    this.parent.appendChild(this.frame);

    // TODO not this
    const frame = this.frame;
    setTimeout(() => {
      frame.style.opacity = 1;
      frame.style.transform = 'translateX(0)';
    }, 10);
  }

  clear() {
    if (this.frame) {
      this.frame.style.opacity = 0;
      this.frame.style.transform = 'translateX(-2ex)';
      this.frame.addEventListener('transitionend', this);
    }
    this.createPage(this.document, this);
    this.cursor = null;
    this.cursorParent = this.body;
    this.afterCursor = this.afterBody;
    this.br = false;
    this.p = true;
    this.carry = '';
    this.optionIndex = 0;
  }

  createPage(document) {
    this.frame = document.createElement('div');
    this.frame.classList.add('kni-frame');
    this.frame.style.opacity = 0;

    const A = document.createElement('div');
    A.classList.add('kni-frame-a');
    this.frame.appendChild(A);

    const B = document.createElement('div');
    B.classList.add('kni-frame-b');
    A.appendChild(B);

    const C = document.createElement('div');
    C.classList.add('kni-frame-c');
    B.appendChild(C);

    this.body = document.createElement('div');
    this.body.classList.add('kni-body');
    C.appendChild(this.body);

    this.options = document.createElement('table');
    this.body.appendChild(this.options);
    this.afterBody = this.options;
  }

  handleEvent(event) {
    if (event.target.parentNode === this.parent) {
      this.parent.removeChild(event.target);
    }
  }

  ask(_cue) {}

  answer(text) {
    this.engine.answer(text);
  }

  close() {}
};
