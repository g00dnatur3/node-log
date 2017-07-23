// since filename = test.js, logTag = test
const log = require('./').log('[test]');

function hello() {
  log('got here');
  function world() {
    log('got here');
  }
  world();
}

hello();

function hello() {
  log('got here');
  setImmediate(function world() {
  	log('got here');
  });
}

setImmediate(hello);
