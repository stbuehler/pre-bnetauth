

function Enroll(region, onSuccess, onFailure) {
	new Mojo.Service.Request('palm://de.stbuehler.bnetauth.service', {
		method: 'enroll',
		parameters: { region: region },
		onSuccess: onSuccess,
		onFailure: onFailure
	});
}

/* list of regions, usable as submenu items */
var EnrollListRegions = [];

function EnrollListRegionsLoad(onLoad) {
	var enrollCustom = { label: $L("Custom"), command: 'cmdEnrollCustom' };
	
	new Mojo.Service.Request('palm://de.stbuehler.bnetauth.service', {
		method: 'list',
		parameters: { },
		onSuccess: function(result) {
			var i, r;
			// Mojo.Log.info("bnetauth: EnrollListRegions onSuccess:" + JSON.stringify(result.regions));
			EnrollListRegions.splice(0, EnrollListRegions.length);
			for (i = 0; i < result.regions.length; i++) {
				r = result.regions[i];
				r.command = 'cmdEnrollRegion ' + r.region;
				EnrollListRegions.push(r);
			}
			EnrollListRegions.push(enrollCustom);
			onLoad();
		},
		onFailure: function(failData) {
			Mojo.Log.error("bnetauth: EnrollListRegions onFailure:" + JSON.stringify(failData.exception));
			Mojo.Controller.errorDialog("EnrollListRegions onFailure: " + failData.exception);
			Mojo.Controller.getAppController().hideSplashScreen();
			window.close();
		}
	});
}

/* takes binary strings, returns hex */
function hex_hmacsha1(key, data) {
	var f = new Future(SHA1.hex_hmac_sha1(key, data));
	return f;
}
