# node-log
Extremley useful log function for javascript code

# install

```
 "dependencies": {
    ...,
    "log": "https://github.com/g00dnatur3/node-log.git",
}
```
 
# examples

```
const log = require('log').log('[Gpio]');
function hello() {
  const world = function() {
    log();
    log('got here');
  }
}
```
