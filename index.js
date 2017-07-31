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

function _log(tag, callChain, str) {
	if (callChain.length > 0) console.log(tag + ' ' + callChain.join(' - ') + ' - ' + str);
	else console.log(tag + ' - ' + str);
}

module.exports = {

	log: function log(logTag) {
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
						if (name) callChain.unshift(name);
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