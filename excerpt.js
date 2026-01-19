// An interface for building excerpts and writing them to a stream.
// The stream must have the interface of the line wrapper.

/** @import { default as Wrapper } from './wrapper' */

/**
 * Excerpt accumulates text for later output.
 */
export default class Excerpt {
  constructor() {
    /** @type {Paragraph[]} */
    this.children = [];
    this.flag = false;
  }

  /** @type {typeof Paragraph} */
  Child = Paragraph;

  paragraph() {
    this.flag = true;
  }

  break() {
    if (this.children.length === 0) {
      return;
    }
    const last = this.children[this.children.length - 1];
    last.break();
  }

  /**
   * @param {string} lift
   * @param {string} delimiter
   * @param {string} conjunction
   */
  startJoin(lift, delimiter, conjunction) {
    if (this.children.length === 0) {
      return;
    }
    const last = this.children[this.children.length - 1];
    last.startJoin(lift, delimiter, conjunction);
  }

  /**
   * @param {string} delimiter
   */
  delimit(delimiter) {
    if (this.children.length === 0) {
      return;
    }
    const last = this.children[this.children.length - 1];
    last.delimit(delimiter);
  }

  stopJoin() {
    if (this.children.length === 0) {
      return;
    }
    const last = this.children[this.children.length - 1];
    last.stopJoin();
  }

  /**
   * @param {string} lift
   * @param {string | string[]} words
   * @param {string} drop
   */
  digest(lift, words, drop) {
    if (typeof words === 'string') {
      words = words.split(' ');
    }
    if (this.children.length === 0 || this.flag) {
      this.children.push(new this.Child());
      this.flag = false;
    }
    const last = this.children[this.children.length - 1];
    last.digest(lift, words, drop);
  }

  /**
   * @param {Wrapper} wrapper
   */
  write(wrapper) {
    for (let i = 0; i < this.children.length; i++) {
      if (i > 0) {
        wrapper.break();
      }
      this.children[i].write(wrapper);
    }
  }
}

class Paragraph {
  constructor() {
    /** @type {Stanza[]} */
    this.children = [];
    this.flag = false;
  }

  /** @type {typeof Stanza} */
  Child = Stanza;

  break() {
    this.flag = true;
  }

  /**
   * @param {string} lift
   * @param {string} delimiter
   * @param {string} conjunction
   */
  startJoin(lift, delimiter, conjunction) {
    if (this.children.length === 0) {
      return;
    }
    const last = this.children[this.children.length - 1];
    last.startJoin(lift, delimiter, conjunction);
  }

  /**
   * @param {string} delimiter
   */
  delimit(delimiter) {
    if (this.children.length === 0) {
      return;
    }
    const last = this.children[this.children.length - 1];
    last.delimit(delimiter);
  }

  stopJoin() {
    if (this.children.length === 0) {
      return;
    }
    const last = this.children[this.children.length - 1];
    last.stopJoin();
  }

  /**
   * @param {string} lift
   * @param {string[]} words
   * @param {string} drop
   */
  digest(lift, words, drop) {
    if (this.children.length === 0 || this.flag) {
      this.children.push(new this.Child());
      this.flag = false;
    }
    const last = this.children[this.children.length - 1];
    last.digest(lift, words, drop);
  }

  /**
   * @param {Wrapper} wrapper
   */
  write(wrapper) {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].write(wrapper);
    }
  }
}

class Stanza {
  constructor() {
    /** @type {string[]} */
    this.children = [];
    /** @type {boolean} */
    this.lift = false;
    this.empty = true;
    /** @type {StanzaProxy | Conjunction} */
    this.cursor = new StanzaProxy(this);
  }

  /**
   * @param {string} lift
   * @param {string} delimiter
   * @param {string} conjunction
   */
  startJoin(lift, delimiter, conjunction) {
    this.cursor = this.cursor.startJoin(lift, delimiter, conjunction);
  }

  /**
   * @param {string} delimiter
   */
  delimit(delimiter) {
    this.cursor.delimit(delimiter);
  }

  stopJoin() {
    this.cursor = this.cursor.stopJoin();
  }

  /**
   * @param {string} lift
   * @param {string[]} words
   * @param {string} drop
   */
  digest(lift, words, drop) {
    this.cursor.digest(lift, words, drop);
  }

  /**
   * @param {Wrapper} wrapper
   */
  write(wrapper) {
    for (let i = 0; i < this.children.length; i++) {
      wrapper.word(this.children[i]);
    }
    wrapper.break();
  }

  /**
   * @param {string | boolean} lift
   * @param {string[]} words
   * @param {string} drop
   */
  proxyDigest(lift, words, drop) {
    lift = this.lift || lift;
    let i = 0;
    if (!lift && words.length && this.children.length) {
      this.children[this.children.length - 1] += words[i++];
    }
    for (; i < words.length; i++) {
      this.children.push(words[i]);
    }
    this.lift = !!drop;
    this.empty = false;
  }
}

class StanzaProxy {
  /**
   * @param {Stanza} parent
   */
  constructor(parent) {
    this.parent = parent;
  }

  /**
   * @param {string} lift
   * @param {string} delimiter
   * @param {string} conjunction
   * @returns {Conjunction}
   */
  startJoin(lift, delimiter, conjunction) {
    return new Conjunction(this, lift, delimiter, conjunction);
  }

  /**
   * @param {string} delimiter
   */
  delimit(delimiter) {
    this.parent.digest('', [delimiter], ' ');
  }

  /**
   * @returns {StanzaProxy}
   */
  stopJoin() {
    throw new Error('cannot stop without starting conjunction');
  }

  /**
   * @param {string} lift
   * @param {string[]} words
   * @param {string} drop
   */
  digest(lift, words, drop) {
    this.parent.proxyDigest(lift, words, drop);
  }
}

class Conjunction {
  /**
   * @param {StanzaProxy | Conjunction} parent
   * @param {string} lift
   * @param {string} delimiter
   * @param {string} conjunction
   */
  constructor(parent, lift, delimiter, conjunction) {
    /** @type {Stanza[]} */
    this.children = [];
    this.parent = parent;
    this.lift = lift;
    this.delimiter = delimiter;
    this.conjunction = conjunction;
    this.flag = false;
  }

  /** @type {typeof Stanza} */
  Child = Stanza;

  delimit() {
    this.flag = true;
  }

  /**
   * @param {string} lift
   * @param {string[]} words
   * @param {string} drop
   */
  digest(lift, words, drop) {
    if (this.children.length === 0 || this.flag) {
      this.children.push(new this.Child());
      this.flag = false;
    }
    const last = this.children[this.children.length - 1];
    last.digest(lift, words, drop);
  }

  /**
   * @param {string} lift
   * @param {string} delimiter
   * @param {string} conjunction
   * @returns {Conjunction}
   */
  startJoin(lift, delimiter, conjunction) {
    return new Conjunction(this, lift, delimiter, conjunction);
  }

  /**
   * @param {string} [drop]
   * @returns {StanzaProxy | Conjunction}
   */
  stopJoin(drop) {
    if (this.children.length === 0) {
      // noop
    } else if (this.children.length === 1) {
      this.parent.digest(this.lift, this.children[0].children, drop || '');
    } else if (this.children.length === 2) {
      this.parent.digest(this.lift, this.children[0].children, '');
      this.parent.digest(' ', [this.conjunction], ' ');
      this.parent.digest(' ', this.children[1].children, drop || '');
    } else {
      for (let i = 0; i < this.children.length - 1; i++) {
        this.parent.digest('', this.children[i].children, '');
        this.parent.digest('', [this.delimiter], ' ');
      }
      this.parent.digest('', [this.conjunction], ' ');
      this.parent.digest('', this.children[this.children.length - 1].children, '');
    }
    return this.parent;
  }
}
