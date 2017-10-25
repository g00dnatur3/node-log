# node-log
Extremley useful log function for javascript code

# console.log vs node-log

logs two extra things:

1) A log tag (I usually make my log tag be '[filename]'
2) Calling function - name of function that is calling the code where the log is happening

If you omit the log tag, it will use the filename instead, pretty great!

# install
```
 "dependencies": {
    ...,
    "node-log": "https://github.com/g00dnatur3/node-log.git",
}
```
 
# example 1
The following code:
```
// the filename this code is contained in is: Gpio.js
const log = require('node-log').log('[Gpio]');

function hello() {
  log('got here');
  
  // alternative syntax:
  // const world = function world() {...
  
  function world() {
    log('got here');
  }
  
  world();
}

hello();
```
Prints this to the console this:
```
[Gpio] hello - got here
[Gpio] world - got here
```

# example 2
The following code:
```
// the filename this code is contained in is: Gpio.js
const log = require('node-log').log('[Gpio]');

// if you omit the log tag, it will use the filename
// const log = require('node-log').log()

function hello() {
  log('got here');
  setImmediate(function world() {
    log('got here');
  });
}

setImmediate(hello);
```
Prints this to the console this:
```
[Gpio] hello - got here
[Gpio] world - got here
```



