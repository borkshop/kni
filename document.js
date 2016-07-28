'use strict';

module.exports = Document;

function Document(element, redraw) {
    var self = this;
    this.document = element.ownerDocument;
    this.parent = element;
    this.container = null;
    this.element = null;
    this.engine = null;
    this.carry = '';
    this.cursor = null;
    this.next = null;
    this.optionIndex = 0;
    this.options = null;
    this.p = false;
    this.br = false;
    this.onclick = onclick;
    this.redraw = redraw;
    function onclick(event) {
        self.answer(event.target.number);
    }
    Object.seal(this);
}

Document.prototype.write = function write(lift, text, drop) {
    var document = this.element.ownerDocument;
    if (this.p) {
        this.cursor = document.createElement("p");
        this.element.insertBefore(this.cursor, this.options);
        this.p = false;
        this.br = false;
    }
    if (this.br) {
        this.cursor.appendChild(document.createElement("br"));
        this.br = false;
    }
    this.cursor.appendChild(document.createTextNode((this.carry || lift) + text));
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
    var document = this.element.ownerDocument;
    var tr = document.createElement("tr");
    this.options.appendChild(tr);
    var th = document.createElement("th");
    tr.appendChild(th);
    th.innerText = this.optionIndex + '.';
    var td = document.createElement("td");
    this.cursor = td;
    td.number = this.optionIndex;
    td.onclick = this.onclick;
    tr.appendChild(td);
};

Document.prototype.stopOption = function stopOption() {
};

Document.prototype.flush = function flush() {
    if (this.redraw) {
        this.redraw();
    }
    // No-op (for console only)
};

Document.prototype.pardon = function pardon() {
    this.options.innerHTML = '';
};

Document.prototype.display = function display() {
    if (this.redraw) {
        this.redraw();
    }
    this.container.style.opacity = 0;
    this.container.style.transform = 'translateX(2ex)';
    this.parent.appendChild(this.container);

    // TODO not this
    var container = this.container;
    setTimeout(function () {
        container.style.opacity = 1;
        container.style.transform = 'translateX(0)';
    }, 10);
};

Document.prototype.clear = function clear() {
    if (this.container) {
        this.container.style.opacity = 0;
        this.container.style.transform = 'translateX(-2ex)';
        this.container.addEventListener("transitionend", this);
    }

    this.container = this.document.createElement("div");
    this.container.classList.add("parent");
    this.container.style.opacity = 0;
    var child = this.document.createElement("div");
    child.classList.add("child");
    this.container.appendChild(child);
    var outer = this.document.createElement("outer");
    outer.classList.add("outer");
    child.appendChild(outer);
    this.element = this.document.createElement("inner");
    this.element.classList.add("inner");
    outer.appendChild(this.element);
    this.options = this.document.createElement("table");
    this.element.appendChild(this.options);

    this.cursor = null;
    this.br = false;
    this.p = true;
    this.carry = '';
    this.optionIndex = 0;
};

Document.prototype.handleEvent = function handleEvent(event) {
    if (event.target.parentNode === this.parent) {
        this.parent.removeChild(event.target);
    }
};

Document.prototype.ask = function ask() {
};

Document.prototype.answer = function answer(text) {
    this.engine.answer(text);
};

Document.prototype.close = function close() {
};
