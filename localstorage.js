'use strict';

module.exports = LocalStorage;

function LocalStorage(storage, prefix) {
    this.storage = storage;
    this.prefix = prefix || '';
}

LocalStorage.prototype.get = function get(name) {
    return this.storage.getItem(this.prefix + name);
};

LocalStorage.prototype.set = function set(name, value) {
    return this.storage.setItem(this.prefix + name, value);
};

LocalStorage.prototype.clear = function clear() {
    this.storage.clear();
};
