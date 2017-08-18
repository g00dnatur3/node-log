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
	
	// keep a mapping of callerFile to the tag
	if (funcMap[callerFile]) {
		_logSelf('instantiating log twice in same file: ' + callerFile);
		funcMap[callerFile].push(tag)
	}
	else {
		funcMap[callerFile] = [tag];
	}
	
	// use a hash because constructor functions have same name as file usually
	assert(!funcMap['#' + tag], 'more than one file has same log tag: ' + tag + ', ' + callerFile);
	funcMap['#' + tag] = callerFile; // ensure tags are unique accross files
	
	const funcs = functionExtractor.parse(data);
	
	for (var i=0; i<funcs.length; i++) {
		const func = funcs[i];
		
		var name = func.name;
		if (name === 'constructor') continue;
		assert(Object.getType(name) === 'string');
		
		if (!funcMap[name]) funcMap[name] = [];
		funcMap[name].push(tag);
	}
}

function createLogTag(callerFile, customTag) {
	if (customTag) {
		if (customTag.startsWith('[')) customTag = customTag.slice(1);
		if (customTag.endsWith(']')) customTag = customTag.slice(0, customTag.length-1);
	}
	const tag = (customTag) ? customTag : path.basename(callerFile).replace('.js', '');
	try {
		addFunctions(tag, callerFile);
	} catch (err) {
		_logSelf('err: ' + err);
		_logSelf('failed to read functions from file: ' + callerFile);
	}
	return tag;
}

function _log(tag, callChain, str) {
	const iso = new Date().toISOString();
	const date = iso.substring(2, iso.length-1);
	if (callChain.length > 0) console.log(date + ' [' + tag + '] ' + callChain.join(' - ') + ' - ' + str);
	else console.log(date + ' [' + tag + '] - ' + str);
}

function getNext(_caller) {
	assert(_caller, '_caller is null');
	try {
		if (_caller.caller) return _caller.caller;
		else return null;
	} catch (err) {
		_logSelf('warn: caller access restricted, usualy caused by strict mode or () => syntax');
		return null;
	}
}

function _logSelf(str) {
	const caller = getCallerFunctionName(arguments);
	const callChain = Object.getType(caller) === 'string' ? [caller] : [];
	_log('node-log', callChain, str);
}

module.exports = {

	log: function log(customTag) {
		
		const callerFile = getCallerFile();
		assert(callerFile, "callerFile is null");
		const logTag = createLogTag(callerFile, customTag);
		assert(logTag, "logTag is null");
		
		return function(str, caller) {
			const _callerFile = getCallerFile();
			try {
				str = (str) ? str.trim() : '';
				if (!caller && !arguments.callee.caller) {
					//console.log(logTag + ' - ' + str);
					
					_log(logTag, [], str);
					return;
				}
				var name;
				const callChain = [];
				if (Object.getType(arguments.callee.caller) === 'function') {
					var _caller = arguments.callee.caller;
					var isTail = true;
					while (_caller) {
						if (callChain.length === 2) break; //max-length=2
						const next = getNext(_caller);
						name = getFunctionName(_caller);
						if (name) {
							var tag;
							if (funcMap[name] && !isTail) {
								if (funcMap[name].length === 1) {
									tag = funcMap[name][0];
								}
								else {
									/*
									if (funcMap[name].length > 1) {
										tag = funcMap[name].join('|');
									}
									*/
									tag = funcMap[_callerFile].join('|');
								}
							}
							var fname;
							if (!tag) fname = name;
							else {
								if (logTag !== tag) fname = tag + '.' + name;
								else fname = name;
							}
							if (callChain.length > 0) {
								// avoid duplicate function names created with .bind()
								if (callChain[0] !== fname) callChain.unshift(fname); 
							}
							else callChain.unshift(fname);
						}
						_caller = next;
						var isTail = false;
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
				
				//if (customTag) _log(customTag, callChain, str);
				//else _log(logTag, callChain, str);
				
				_log(logTag, callChain, str);
			}
			catch (err) {
				_logSelf('err: ');
				console.log(err.stack);
			}
		}
	},

	getCallerFunctionName: getCallerFunctionName,
	
	getFunctionName: getFunctionName

}
