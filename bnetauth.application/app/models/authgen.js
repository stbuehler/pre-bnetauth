
AuthGen = function() {
	function keyFromHMAC(input) {
		var pos = input[input.length - 1] & 0xf;
		var num = ((input[pos] & 0x7f) << 24) + ((input[pos + 1] & 0xff) << 16)
			+ ((input[pos + 2] & 0xff) << 8) + (input[pos + 3] & 0xff);
		num = num % 100000000;
		num = "00000000" + num.toString();
		num = num.substr(num.length - 8, 8);
		return num;
	}
	
	function timeSlot(slotOffset) {
		var cur = new Date();
		var slot = Math.floor(slotOffset + cur.getTime() / 30000);
		return { 'slot': slot, 'from': new Date(slot * 30000), 'to': new Date((slot+1) * 30000) };
	}
	
	function slotToString(slot) {
		slot = slot.slot;
		for (var i = 8, result = [ 0, 0, 0, 0, 0, 0, 0, 0 ]; i-- > 0; ) {
			result[i] = String.fromCharCode(slot & 0xff);
			slot = slot >>> 8;
		}
		return result.join('');
	}
	
	function hexToString(hex) {
		for (var result = '', c = 0; c < hex.length; c += 2)
			result += String.fromCharCode(parseInt(hex.substr(c, 2), 16));
		return result;
	}
	function hexToBytes(hex) {
		for (var bytes = [], c = 0; c < hex.length; c += 2)
			bytes.push(parseInt(hex.substr(c, 2), 16));
		return bytes;
	}

	function generate(token, slotOffset) {
		if (!slotOffset) slotOffset = 0;
		var slot = timeSlot(slotOffset);

		var f = hex_hmacsha1(hexToString(token), slotToString(slot)); 
		
		f.then(function(future) {
			var digest = future.result;
			var result = hexToBytes(digest);
			var key = keyFromHMAC(result);
//			Mojo.Log.error("Crypt success, data="+digest + ", key = " + key + ", valid from: " + slot.from.toString() + ", slot: " + slot.slot);
			future.setResult({ 'key': key, 'slot': slot });
		});

		return f;
	};
	
	return generate;
}();
