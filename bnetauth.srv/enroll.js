// Node.js require load
if (typeof require === "undefined") {
	require = IMPORTS.require;
}

// Convert a byte array to a hex string
function bufferToHex(bytes) {
	for (var hex = [], i = 0; i < bytes.length; i++) {
		hex.push((bytes[i] >>> 4).toString(16));
		hex.push((bytes[i] & 0xF).toString(16));
	}
	return hex.join("");
}

// Convert a hex string to a byte array
function hexToBuffer(hex) {
	if (hex.length % 2 == 1) hex = "0" + hex;
	var b = new Buffer(hex.length >>> 1);
	for (var i = 0, c = 0; c < hex.length; c += 2, i++)
		b[i] = parseInt(hex.substr(c, 2), 16);
	return b;
}

var Enroll = function () {
/*
	if (typeof BigInteger === "undefined") {
		var Script = process.binding('evals').Script;
		var BigInteger = require('./jsbn').BigInteger;
	}
*/

	var nodeHttp = require('http');
	var nodeUrl = require('url');

	var bnet_rsa_modulus = new BigInteger(
		"955e4bd989f3917d2f15544a7e0504eb9d7bb66b6f8a2fe470e453c779200e5e" +
		"3ad2e43a02d06c4adbd8d328f1a426b83658e88bfd949b2af4eaf30054673a14" +
		"19a250fa4cc1278d12855b5b25818d162c6e6ee2ab4a350d401d78f6ddb99711" +
		"e72626b48bd8b5b0b7f3acf9ea3c9e0005fee59e19136cdb7c83f2ab8b0a2a99", 16);
	var bnet_rsa_exp = 0x101;

	var regions = {
		'US Battle.net': {
			url: 'http://m.us.mobileservice.blizzard.com/enrollment/enroll.htm',
			key: [ bnet_rsa_modulus, bnet_rsa_exp ],
			label: 'US Battle.net',
			regioncode: 'US'
		},
		'EU Battle.net': {
			url: 'http://m.eu.mobileservice.blizzard.com/enrollment/enroll.htm',
			key: [ bnet_rsa_modulus, bnet_rsa_exp ],
			label: 'EU Battle.net',
			regioncode: 'EU'
		},
	};

	function enrollmentdata(xorkey, regioncode, phone) {
		if (!phone) phone = "Motorola RAZR v3";
		if (16 != Buffer.byteLength(phone, 'utf8')) throw new Error("phone must have length 16");
		if (2 != Buffer.byteLength(regioncode, 'utf8')) throw new Error("regioncode must have length 2");

		// 1 byte "\x01", 37 bytes xorkey, 2 bytes region, 16 bytes phone
		var b = new Buffer(56);
		b[0] = 0x01;
		xorkey.copy(b, 1);
		b.write(regioncode, 38, 'utf8');
		b.write(phone, 40, 'utf8');
		return b;
	}

	function encrypt(key, data) {
		var i = new BigInteger(data);
		var enc = i.modPowInt(key[1], key[0]);
		return hexToBuffer(enc.toString(16));
	}

	// Generate an array of any length of random bytes
	function randomBytes(n) {
		var bytes = new Buffer(n);
		while (n-- > 0) {
			bytes[n] = Math.floor(Math.random() * 256);
		}
		return bytes;
	}
	function xorkey() {
		return randomBytes(37);
	}

	function E(region, onSuccess, onFailure) {
		this.finished = false;
		this.onSuccess = onSuccess;
		this.onFailure = onFailure;

		var r = regions[region];
		if (!r) return this.fail("Unknown region '" + region + "'"); 
		
		this.region = r;
		this.enroll();
	}

	E.prototype.enrolldata = function(phone) {
		return encrypt(this.region.key, enrollmentdata(this.xorkey, this.region.regioncode, phone));
	};

	E.prototype.decoderesponse = function(data) {
		var time = 0, token, serial;
		var i;

		for (i = 0; i < 8; i++) time = (time << 8) | data[i];

		/* decrypt */
		for (i = 8; i < 45; i++) data[i] ^= this.xorkey[i-8];

		token = bufferToHex(data.slice(8, 28));
		serial = data.slice(28, 45).toString('utf8').replace(/-/g, '');

		console.log("bnetauth enroll: token = " + token + ", serial = '" + serial + "', time = " + time);

		return { 'time': time, 'token': token, 'serial': serial };
	};

	function safe(f) {
		return function() {
			try {
				return f.apply(this, arguments);
			} catch (e) {
				console.log("bnetauth enroll exception: ", e.stack);
				this.fail(e.message);
			}
		};
	}
	
	E.prototype.fail = function(msg) {
		if (this.finished) return;
		this.finished = true;
		console.log("bnetauth enroll: " + msg);
		if (this.onFailure) this.onFailure(msg);
	};
	E.prototype.success = function(result) {
		if (this.finished) return;
		this.finished = true;
		if (this.onSuccess) this.onSuccess(result);
	};
	
	E.prototype.enroll = safe(function() {
		this.xorkey = xorkey();

		var enrolldata = this.enrolldata();
		console.log("bnetauth enroll: send data length=" + (enrolldata.length)); // #DEBUG
		console.log("bnetauth enroll: xorkey = " + bufferToHex(this.xorkey)); // #DEBUG
		console.log("bnetauth enroll: send data = " + bufferToHex(enrolldata)); // #DEBUG

		url = nodeUrl.parse(this.region.url);
		var secure = ("https" == url.protocol);
		var client = nodeHttp.createClient(url.port ? url.port : (secure ? 443 : 80), url.hostname);
		client.on('error', this.onError.bind(this));
		var request = client.request('POST', (url.pathname && url.pathname.length > 0 ? url.pathname : '/') + (url.search ? url.search : ''), {
			'Host': url.hostname,
			'Content-Type': 'application/octet-stream',
			'Content-Length': enrolldata.length,
		});
		request.end(enrolldata); 
		request.on('response', this.onResponse.bind(this)); 
	});

	E.prototype.onError = function(e) {
		return this.fail("Connection failed: " + e.message);
	};
	E.prototype.onResponse = safe(function(response) {
		if (response.statusCode != 200) {
			return this.fail("Request failed: " + response.statusCode);
		} else {
			/* expect 45 bytes */
			this.body = new Buffer(45);
			this.bodypos = 0;
			response.on('data', this.onData.bind(this));
			response.on('end', this.onEnd.bind(this));
		}
	});
	E.prototype.onData = safe(function(chunk) {
		if (chunk.length > this.body.length - this.bodypos) return this.fail("response too long");
		chunk.copy(this.body, this.bodypos);
		this.bodypos += chunk.length;
	});
	E.prototype.onEnd = safe(function() {
		if (this.bodypos != this.body.length) return this.fail("response too short");
		console.log("bnetauth enroll: response: " + bufferToHex(this.body)); // #DEBUG
		var result = this.decoderesponse(this.body);
		if (result) {
			this.success(result);
		} else {
			console.log("bnetauth enroll: Couldn't decode response: " + bufferToHex(this.body));
			this.fail("Couldn't decode response");
		}
	});

	function doEnroll(region, onSuccess, onFailure) {
		new E(region, onSuccess, onFailure);
	}

	doEnroll.getRegions = function() {
		var keys = [];
		for(i in regions) if (regions.hasOwnProperty(i)) {
			keys.push({ region: i, label: regions[i].label });
		}
		return keys;
	}
	
	return doEnroll;
}();

if (typeof exports !== "undefined") exports.Enroll = Enroll;
