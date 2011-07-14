var libraries   = MojoLoader.require({ name: "foundations", version: "1.0" }, { name: "foundations.crypto", version: "1.0" });
var PalmCall    = libraries["foundations"].Comms.PalmCall; 
var Class       = libraries["foundations"].Class;  
var Future      = libraries["foundations"].Control.Future;

var SHA1        = libraries["foundations.crypto"].SHA1;

/* wait for "this" future to reach this point, run "inner" in background; copy result from "inner" future */
Future.prototype.nest = function(inner) {
	var succ, result, exc, wait = 2, f = this;
	this.then(function () {
		f.exception;
		if (0 == --wait) { if (succ) f.result = result; else f.exception = exc; }
	});
	inner.then(function (future) {
		if (future.exception) { succ = false; exc = future.exception; } else { succ = true; result = future.result; }
		if (0 == --wait) { if (succ) f.result = result; else f.exception = exc; }
	});
	return this;
};

var AppAssistant = Class.create({
	initialize: function (controller) {
		/* this is the creator function for your app assistant object */
	},
	
	setup: function() {
	}
});

