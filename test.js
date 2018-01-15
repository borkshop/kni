'use strict';

Error.stackTraceLimit = 1024;

require('./outline-lexer-test');
require('./inline-lexer-test');
require('./engine-test');
require('./expression-test');

process.exit(global.fail);
