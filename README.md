# node-log
useful log function for javascript based on log4js

# install
```
 "dependencies": {
    ...,
    "node-log": "https://github.com/g00dnatur3/node-log.git",
}
```
 
# example
const log = require('../src/log')(__filename);

log.info('hello world');

log.info('{bold} bold-hello', 'not bold', '{bold} this is bold')
