var Identity = Class.create({
	initialize: function(settings, details) {
		this.settings = settings;
		this.details = details;
		this.name = details.name;
		this.serial = details.serial;
		this.token = details.token;
		this.key = AuthGen(details.token);
		this._updatekey = this._updatekey.bind(this);
	},
	
	nameGet: function() {
		return this.name;
	},
	nameSet: function(name) {
		this.name = this.details.name = name;
		this.settings.save();
	},
	
	tokenGet: function() {
		return this.token;
	},
	tokenSet: function(token) {
		this.token = this.details.token = token;
		this.settings.save();
	},
	
	serialGet: function() {
		return this.serial;
	},
	serialSet: function(serial) {
		this.serial = this.details.serial = serial;
		this.settings.save();
	},
	
	_updatekey: function(future) {
		var r = future.result;
		this.key = r;
		future.setResult(r); /* pass result through */
	},
	generate: function(slotOffset) {
		var f = AuthGen(this.token, slotOffset);
		if (!slotOffset) {
			f.then(this._updatekey);
		}
		return f;
	},
});

var Settings = Class.create({
	initialize: function(onLoaded) {
		this.need_save = false; this.saving = false;
		this.onLoaded = onLoaded;
		this.ids = [];
		this.model = { items: this.ids };
		this.onDepotFailure = this.onDepotFailure.bind(this);
		this.depot = new Mojo.Depot({name: 'de.stbuehler.bnetauth' }, this.onOpenDepot.bind(this), this.onDepotFailure);
	},
	
	onDepotFailure: function(errMsg) {
		Mojo.Log.error("bnetauth settings: depot failure: " + errMsg);
		Mojo.Controller.errorDialog("Depot failure: " + errMsg);
		Mojo.Controller.getAppController().hideSplashScreen();
		window.close();
	},
	
	onOpenDepot: function() {
		this.depot.get(Settings.storageKey, function(result) {
			this.values = result;
			if (null === result) {
				this.setDefaults();
				this.save();
			}

			this.ids.splice(0, this.ids.length);
			for (var i = 0; i < this.values.identities.length; i++) {
				var o = this.values.identities[i];
				if (!o.name) o.name = 'Unnamed'
				if (!o.token) o.token = 'empty token';
				if (!o.serial) o.serial = 'Unknown';
				this.ids.push(new Identity(this, o));
			}
			this.onLoaded();
		}.bind(this), this.onDepotFailure);
	},
	
	save: function() {
		if (this.saving) {
			this.need_save = true; /* delay save until previous is done */
		} else {
			this.saving = true;
			this.depot.add(Settings.storageKey, this.values, function() {
				this.saving = false;
				if (this.need_save) save(); /* save again */
			}.bind(this), this.onDepotFailure);
		}
	},

	setDefaults: function() {
		this.values = {
			identities: [],
		};
	},

	identitiesGet: function() {
		return this.ids;
	},
	
	identityAdd: function(name, token, serial) {
		var o = { name: name, token: token, serial: serial };
		this.values.identities.push(o);
		this.ids.push(new Identity(this, o));
		this.save();
	},
	identityDel: function(index) {
		this.values.identities.splice(index, 1);
		this.ids.splice(index, 1);
		this.save();
	},
	_arrayMove: function(arr, from, to) {
		var e = arr.splice(from, 1)[0];
		arr.splice((from < to ? -1 : 0) + to, 0, e);
	},
	identityMove: function(from, to) {
		this._arrayMove(this.values.identities, from, to);
		this._arrayMove(this.ids, from, to);
		this.save();
	},
});

Settings.storageKey = "settings";
