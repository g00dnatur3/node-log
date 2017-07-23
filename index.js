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

const getFunctionName = function getFunctionName(fun) {
	var ret = fun.toString();
	ret = ret.substr('function '.length);
	ret = ret.substr(0, ret.indexOf('('));
	return ret.trim();
}

module.exports = {

	log: function log(logTag) {
		return function(str, caller) {

			if (!str) str = '';
			if (!caller && !arguments.callee.caller) {
				console.log(logTag + ' - ' + str);
				return;
			}
			if (!caller && arguments.callee.caller.name) {
				caller = arguments.callee.caller.name.trim();
			} else if (!caller) {
				caller = getFunctionName(arguments.callee.caller);
			}

			if (Object.getType(caller) === 'function') {
				caller = getFunctionName(caller);
			}
			(str.length === 0)
				? console.log(logTag + ' ' + caller)
				: console.log(logTag + ' ' + caller + ' - ' + str);
			
		}
	}

}

