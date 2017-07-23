# node-log
Extremley useful log function for javascript code

# console.log vs node-log

logs two extra things:

1) A log tag (I usually make my log tag be '[filename]'
2) Calling function - name of function that is calling the code where the log is happening


# install
```
 "dependencies": {
    ...,
    "log": "https://github.com/g00dnatur3/node-log.git",
}
```
 
# examples
The following code:
```
const log = require('log').log('[Gpio]');

function hello() {
  log('got here');
  const world = function() {
    log('got here');
  }
}
```
Prints this to the console this:
```
[Gpio] hello - got here
[Gpio] world - got here
```
