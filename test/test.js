// since filename = test.js, logTag = test
const log = require('../src/log')(__filename);

log.info('hello world');

log.info('{bold} bold-hello', 'not bold', '{bold} this is bold')

