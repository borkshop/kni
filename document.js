'use strict';

module.exports = Document;

function Document(element, createPage) {
    var self = this;
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
    this.onclick = onclick;
    this.createPage = createPage || this.createPage;
    function onclick(event) {
        self.answer(event.target.number);
    }
    Object.seal(this);
}

Document.prototype.write = function write(lift, text, drop) {
    var document = this.document;
    lift = this.carry || lift;
    if (this.p) {
        this.cursor = document.createElement("p");
        this.cursorParent.insertBefore(this.cursor, this.afterCursor);
        this.p = false;
        this.br = false;
        lift = '';
    }
    if (this.br) {
        this.cursor.appendChild(document.createElement("br"));
        this.br = false;
        lift = '';
    }
    // TODO merge with prior text node
    this.cursor.appendChild(document.createTextNode(lift + text));
    this.carry = drop;
};

Document.prototype.break = function _break() {
    this.br = true;
};

Document.prototype.paragraph = function paragraph() {
    this.p = true;
};

Document.prototype.startOption = function startOption() {
    this.optionIndex++;
    var document = this.document;
    var tr = document.createElement("tr");
    this.options.appendChild(tr);
    var th = document.createElement("th");
    tr.appendChild(th);
    th.innerText = this.optionIndex + '.';
    var td = document.createElement("td");
    td.number = this.optionIndex;
    td.onclick = this.onclick;
    td.setAttribute("aria-role", "button");
    tr.appendChild(td);
    this.cursor = td;
    this.p = false;
    this.br = false;
    this.carry = '';
};

Document.prototype.stopOption = function stopOption() {
    this.p = false;
    this.br = false;
};

Document.prototype.flush = function flush() {
    // No-op (for console only)
};

Document.prototype.pardon = function pardon() {
    // No-op (for console only)
};

Document.prototype.display = function display() {
    this.frame.style.opacity = 0;
    this.frame.style.transform = 'translateX(2ex)';
    this.parent.appendChild(this.frame);

    // TODO not this
    var frame = this.frame;
    setTimeout(function () {
        frame.style.opacity = 1;
        frame.style.transform = 'translateX(0)';
    }, 10);
};

Document.prototype.clear = function clear() {
    if (this.frame) {
        this.frame.style.opacity = 0;
        this.frame.style.transform = 'translateX(-2ex)';
        this.frame.addEventListener("transitionend", this);
    }
    this.createPage(this.document, this);
    this.cursor = null;
    this.cursorParent = this.body;
    this.afterCursor = this.afterBody;
    this.br = false;
    this.p = true;
    this.carry = '';
    this.optionIndex = 0;
};

Document.prototype.createPage = function createPage(document) {
    this.frame = document.createElement("div");
    this.frame.classList.add("kni-frame");
    this.frame.style.opacity = 0;

    var A = document.createElement("div");
    A.classList.add("kni-frame-a");
    this.frame.appendChild(A);

    var B = document.createElement("div");
    B.classList.add("kni-frame-b");
    A.appendChild(B);

    var C = document.createElement("div");
    C.classList.add("kni-frame-c");
    B.appendChild(C);

    this.body = document.createElement("div");
    this.body.classList.add("kni-body");
    C.appendChild(this.body);

    this.options = document.createElement("table");
    this.body.appendChild(this.options);
    this.afterBody = this.options;
};

Document.prototype.handleEvent = function handleEvent(event) {
    if (event.target.parentNode === this.parent) {
        this.parent.removeChild(event.target);
    }
};

Document.prototype.ask = function ask(cue) {
};

Document.prototype.answer = function answer(text) {
    this.engine.answer(text);
};

Document.prototype.close = function close() {
};
