'use strict';
const translate = module => {
  module.text = 'module.exports = ' + module.text;
};
module.exports = translate;
