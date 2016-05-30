'use strict';
module.exports = translate;
function translate(module) {
    module.text = 'module.exports = ' + module.text;
}
