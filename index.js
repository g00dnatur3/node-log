const assert = require('assert');
const fs = require("fs");
const functionExtractor = require("function-extractor");
const path = require('path');

if (!Object.getType) {
	Object.getType = (function(global) {
		const cache = {};
		return function getType(obj) {
	    	var key;
	    	return obj === null ? 'null' // null
	        	: obj === global ? 'global' // window in browser or global in nodejs
	        	: (key = typeof obj) !== 'object' ? key // basic: string, boolean, number, undefined, function
	        	: obj.nodeType ? 'object' // DOM element
	        	: cache[key = Object.prototype.toString.call(obj)] // cached. date, regexp, error, object, array, math
	        	|| (cache[key] = key.slice(8, -1).toLowerCase()); // get XXXX from [object XXXX], and cache it
		};
	}(this));
}

function getCallerFile() {
    var originalFunc = Error.prepareStackTrace;
    var callerfile;
    try {
        var err = new Error();
        var currentfile;
        Error.prepareStackTrace = function (err, stack) { return stack; };
        currentfile = err.stack.shift().getFileName();
        while (err.stack.length) {
            callerfile = err.stack.shift().getFileName();
            if(currentfile !== callerfile) break;
        }
    } catch (e) {}
    Error.prepareStackTrace = originalFunc;
    return callerfile;
}

function getFunctionName(fun) {
	if (fun.name && fun.name.length > 0) return fun.name.trim();
	var ret = fun.toString();
	ret = ret.substr('function '.length);
	ret = ret.substr(0, ret.indexOf('(')).trim();
	return ret.length === 0 ? null : ret;
}

function getCallerFunctionName(_arguments) {
	return (_arguments.callee.caller.name) 
		? _arguments.callee.caller.name.trim()
		: getFunctionName(_arguments.callee.caller);
}

const funcMap = {};

function addFunctions(tag, callerFile) {
	var data = fs.readFileSync(callerFile, "utf8").trim();
	if (data[0] === '#' && data[1] === '!') {
		// remove bash header if exists...
		data = data.substring(data.indexOf("\n") + 1).trim();
	}
	const funcs = functionExtractor.parse(data);
	for (var i=0; i<funcs.length; i++) {
		const func = funcs[i];
		//console.log('func.name: ' + func.name + ', tag: ' + tag);
		funcMap[func.name] = tag;
	}
}

function formalName(funcName, logTag, customTag) {
	var tag = funcMap[funcName];
	if (!tag) return funcName;
	tag = tag.replace('[', '').replace(']', '');
	logTag = logTag.replace('[', '').replace(']', '');
	//console.log();
	//console.log('funcName: ' + funcName);
	//console.log('logTag: ' + logTag);
	//console.log('tag: ' + tag);
	//console.log();
	if (tag === funcName) return funcName;
	if (tag === logTag) return funcName;
	else {
		return (customTag) ? customTag + '.' + funcName : tag + '.' + funcName;
	}
}

function createLogTag(callerFile) {
	const tag = '[' + path.basename(callerFile).replace('.js', '') + ']';
	try {
		addFunctions(tag, callerFile);
	} catch (err) {
		console.log('[node-log] - createLogTag - warn: failed read functions from file: ' + callerFile);
	}
	return tag;
}

function _log(tag, callChain, str) {
	if (callChain.length > 0) console.log(tag + ' ' + callChain.join(' - ') + ' - ' + str);
	else console.log(tag + ' - ' + str);
}

module.exports = {

	log: function log(customTag) {
		const callerFile = getCallerFile();
		assert(callerFile, "callerFile is null");
		const logTag = createLogTag(callerFile);
		assert(logTag, "logTag is null");
		return function(str, caller) {
			try {
				str = (str) ? str.trim() : '';
				if (!caller && !arguments.callee.caller) {
					console.log(logTag + ' - ' + str);
					return;
				}
				var name;
				const callChain = [];
				if (Object.getType(arguments.callee.caller) === 'function') {
					var _caller = arguments.callee.caller;
					while (_caller) {
						name = getFunctionName(_caller);
						const fname = formalName(name, logTag);
						if (name) {
							if (callChain.length > 0) {
								// avoid duplicate function names created with .bind()
								if (callChain[0] !== name) callChain.unshift(fname); 
							}
							else callChain.unshift(fname);
						}
						_caller = _caller.caller;
					}
				}				
				// caller is special adhoc allowing user to log extra function or tag
				const callerType = Object.getType(caller);
				if (callerType === 'function') {
					name = getFunctionName(caller);
					if (name) callChain.push(name);
				}
				else if (callerType === 'string') {
					callChain.push(caller);
				}
				// limit depth of the call chain
				while (callChain.length > 2) callChain.shift();
				
				if (customTag) _log(customTag, callChain, str);
				else _log(logTag, callChain, str);
			}
			catch (err) {
				console.log(err.stack);
			}
		}
	},

	getCallerFunctionName: getCallerFunctionName,
	
	getFunctionName: getFunctionName

}