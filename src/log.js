const log4js = require(`log4js`);
const path = require(`path`);
const prefix = path.resolve(process.cwd(), `../`);
const clc = require(`cli-color`);

module.exports = (tag) => {
  tag = tag.replace(prefix, ``);
  const log = log4js.getLogger(tag);
  log.err = log.error;
  log.level = `debug`;
  const _infoLog = log.info;
  log.info = (...args) => {
    const _args = [];
    for (let arg of args) {
      if (typeof arg === `string` && arg.startsWith(`{bold}`)) {
        arg = arg.replace(`{bold}`, ``).trimLeft();
        arg = clc.bold(arg);
        _args.push(arg);
      } else {
        _args.push(arg);
      }
    }
    _infoLog.apply(log, _args);
  };
  return log;
};