
// Node.js require load
if (typeof require === "undefined") {
	require = IMPORTS.require;
}

function safeFuture(func) {
	function cb(future) {
		try {
			func.apply(this, arguments);
			future.then(function(future) {
				if (future.exception) {
					var e = future.exception;
					if (!e.errorCode) e.errorCode = -1;
					future.exception = e;
				} else {
					future.result = future.result;
				}
			});
		} catch (e) {
			e.errorCode = -1;
			future.exception = e;
		}
	}
	return cb;
}

var sys = require('sys');

function EnrollCommandAssistant() {
}
  
EnrollCommandAssistant.prototype.run = safeFuture(function(future) {
	var region = this.controller.args.region;
	Enroll(region, function(result) { future.result = result; }, function (msg) {
		var e = new Error(msg);
		e.errorCode = -1;
		future.exception = e; 
	});
});

function EnrollRegionListCommandAssistant() {
}
  
EnrollRegionListCommandAssistant.prototype.run = safeFuture(function(future) {
	future.result = { regions:  Enroll.getRegions() };
});
