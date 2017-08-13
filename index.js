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
	
	assert(!funcMap[callerFile], 'instantiating log twice in same file: ' + callerFile);
	funcMap[callerFile] = tag; // keep a mapping of callerFile to the tag
	
	// use a hash because constructor functions have same name as file usually
	assert(!funcMap['#' + tag], 'more than one file has same log tag: ' + tag + ', ' + callerFile);
	funcMap['#' + tag] = callerFile; // ensure tags are unique accross files
	
	const funcs = functionExtractor.parse(data);
	
	for (var i=0; i<funcs.length; i++) {
		const func = funcs[i];
		//console.log('func.name: ' + func.name + ', tag: ' + tag);
		const val = {tag: tag, callerFile: callerFile};
		if (!funcMap[func.name]) {
			funcMap[func.name] = val;
		} else {
			if (Object.getType(funcMap[func.name]) !== 'array') {
				const _tmp = funcMap[func.name];
				funcMap[func.name] = [_tmp];
			}
			funcMap[func.name].push(val);
		}
	}
	
	for (var i=0; i<funcs.length; i++) {
		const func = funcs[i];
		if (Object.getType(funcMap[func.name]) === 'array') {
			const vals = funcMap[func.name];
			delete funcMap[func.name];
			for (var j=0; j<vals.length; j++) {
				const _tmp = vals[j];
				funcMap[_tmp.tag + '.' + func.name] = _tmp;
			}
		}
	}
}

function getTag(funcName) {
	// the way i am doing this is not the simple-est
	// but its more of an optimization
	// i dont have to call getCallerFile() if the func.name is unique.
	if (!funcMap[funcName]) {
		const callerFile = getCallerFile();		
		if (funcMap[callerFile]) {
			const _tag = funcMap[callerFile];
			const key = funcMap[_tag + '.' + funcName]
			return (funcMap[key]) ? funcMap[key].tag : null;
		}
		else return null;
	} 
	else return funcMap[funcName].tag;
}

function formalName(funcName, logTag) {
	assert(funcName, 'funcName is null');
	const tag = getTag(funcName);
	if (!tag) return funcName;
	
	//console.log();
	//console.log('funcName: ' + funcName);
	//console.log('logTag: ' + logTag);
	//console.log('tag: ' + tag);
	//console.log();
	
	if (tag === funcName) return funcName;
	if (tag === logTag) return funcName;
	else {
		return tag + '.' + funcName;
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
		console.log('[node-log] - createLogTag - warn: failed to read functions from file: ' + callerFile);
	}
	return tag;
}

function _log(tag, callChain, str) {
	if (callChain.length > 0) console.log('[' + tag + '] ' + callChain.join(' - ') + ' - ' + str);
	else console.log('[' + tag + '] - ' + str);
}

module.exports = {

	log: function log(customTag) {
		const callerFile = getCallerFile();
		assert(callerFile, "callerFile is null");
		const logTag = createLogTag(callerFile, customTag);
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
						if (name) {
							const fname = formalName(name, logTag);
							if (callChain.length > 0) {
								// avoid duplicate function names created with .bind()
								if (callChain[0] !== name) callChain.unshift(fname); 
							}
							else callChain.unshift(fname);
						}
						
						try {
							_caller = _caller.caller;
						} catch (err) {
							console.log('[node-log] - log - warn: caller access restricted, usualy caused by strict mode or () => syntax');
							// TypeError: 
							// 'caller' and 'arguments' are restricted function properties and cannot be accessed in this context.
							// cause by using () => syntax to define a function or strict mode...
							break;
						}
						
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
				console.log(err.stack);
			}
		}
	},

	getCallerFunctionName: getCallerFunctionName,
	
	getFunctionName: getFunctionName

}
