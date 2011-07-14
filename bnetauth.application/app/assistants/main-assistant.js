var MainAssistant = Class.create({
	initialize: function(settings) {
	    this.settings = settings;
	    this.curkey = null;
	    this.timerid = -1;
	    this.active = false;
	    
	    this.keys = [];
	    this.model = { items: this.keys };
		this.async = new Future(true);
		
		this.checktimer = this.checktimer.bind(this);
	    /* this is the creator function for your scene assistant object. It will be passed all the 
		   additional parameters (after the scene name) that were passed to pushScene. The reference
		   to the scene controller (this.controller) has not be established yet, so any initialization
		   that needs the scene controller should be done in the setup function below. */
	},
	
	setup: function() {
		/* this function is for setup tasks that have to happen when the scene is first created */
			
		/* use Mojo.View.render to render view templates and add them to the scene, if needed */
		
		/* setup widgets here */
		
		/* add event handlers to listen to events from widgets */
	
		var appMenuModel = {
			visible: true,
			items: [
				// {label: $L('Preferences'), command:'cmdSettings'},
				{label: $L('Identitites'), command:'cmdIdentities'},
				{label:$L('About'), command:Mojo.Menu.helpCmd, disabled:false}
			]
		};
		var self = this;
		this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, appMenuModel);
		
		this.controller.setupWidget("idList", {
			itemTemplate: "main/identity",
			listTemplate: "main/identity-list",
			swipeToDelete: false,
			renderLimit: 40,
			reorderable: false,
		}, this.model);
	
		this.controller.setupWidget('nextKey', { modelProperty: 'nextKey' }, { });

		/* disable timer if loosing focus, ... */
		this.stageDocument = this.controller.stageController.document;
		this.activateStage = this.activate.bindAsEventListener(this);
		this.deactivateStage = this.deactivate.bindAsEventListener(this);
		Mojo.Event.listen(this.stageDocument, Mojo.Event.stageActivate, this.activateStage);
		Mojo.Event.listen(this.stageDocument, Mojo.Event.stageDeactivate, this.deactivateStage);
	},
	
	refreshkey: function(now, k, id) {
		if (now > k.to) {
			if (k.key == '') {
				this.async.nest(id.generate(-1)).then(function(future) {
					k.prevkey = future.result.key;
					future.setResult(true);
				});
			} else {
				k.prevkey = k.key;
			}
			this.async.nest(id.generate()).then(function(future) {
				var r = future.result;
				future.setResult(true);
				k.key = r.key;
				k.from = r.slot.from.getTime();
				k.date = r.slot.from.toLocaleTimeString();
				k.to = r.slot.to.getTime();

				var v;
				v = (k.to - now) / (k.to - k.from);
				if (v > 1) v = 1;
				if (v < 0) v = 0;
				k.nextKey = v;
			});
		} else {
			var v;
			v = (k.to - now) / (k.to - k.from);
			if (v > 1) v = 1;
			if (v < 0) v = 0;
			k.nextKey = v;
		}
	},
	
	refreshkeys: function() {
		var ids = this.settings.identitiesGet();
		var now = (new Date()).getTime(); /* seconds */
		var i;
		if (this.keys.length > ids.length) {
			this.keys.splice(ids.length, this.keys.length - ids.length);
		}
		for (i = 0; i < ids.length; i++) {
			var id = ids[i];
			var k = this.keys[i];
			if (!k || k.id != id || k.token != id.token) {
				/* new identity/token */
				this.keys[i] = k = {
					id: id,
					name: id.name,
					token: id.token,
					key: '',
					prevkey: '',
					date: '',
					from: 0,
					to: 0,
					nextKey: 0.5,
				};
			} else {
				k.name = id.name;
			}
			this.refreshkey(now, k, id);
		}
		this.async.then(function(future) {
			this.controller.modelChanged(this.model);
			future.setResult(true);
		}.bind(this));
	},
	
	checktimer: function(future) {
		if (this.active && -1 == this.timerid) this.timerid = this.controller.window.setTimeout(this.timer.bind(this), 1000);
		future.setResult(true);
	},
	
	timer: function(event) {
		// Mojo.Log.error("bnetauth: timer");
		this.timerid = -1;
		this.refreshkeys();
		this.async.then(this.checktimer);
	},
	
	activate_stage: function(event) {
		this.activate(event);
	},
	
	activate: function(event) {
	    this.active = true;
		if (0 === this.settings.identitiesGet().length) {
			window.setTimeout(function() {
				if (this.controller.stageController.topScene() === this.controller) {
					Mojo.Log.error("bnetauth: no identities, close");
					window.close(); 
				}
			}.bind(this), 1);
		}
		this.refreshkeys();
		this.async.then(this.checktimer);
		/* put in event handlers here that should only be in effect when this scene is active. For
		   example, key handlers that are observing the document */
	},
	
	deactivate_stage: function(event) {
		this.deactivate(event);
	},
	
	deactivate: function(event) {
	    this.active = false;
		/* remove any event handlers you added in activate and do any other cleanup that should happen before
		   this scene is popped or another scene is pushed on top */
		if (-1 != this.timerid) {
			this.controller.window.clearTimeout(this.timerid);
			this.timerid = -1;
		}
	},
	
	cleanup: function(event) {
	    this.active = false;
		/* this function should do any cleanup needed before the scene is destroyed as 
		   a result of being popped off the scene stack */
		if (-1 != this.timerid) {
			this.controller.window.clearTimeout(this.timerid);
			this.timerid = -1;
		}

		Mojo.Event.stopListening(this.stageDocument, Mojo.Event.stageActivate, this.activateStage);
		Mojo.Event.stopListening(this.stageDocument, Mojo.Event.stageDeactivate, this.deactivateStage);
	},
	
	handleCommand: function(event) {
		this.controller=Mojo.Controller.stageController.activeScene();
	
		if (event.type == Mojo.Event.command) {
			switch (event.command) {
			case "cmdIdentities":
				Mojo.Controller.stageController.pushScene('identities', this.settings);
				break;
			case Mojo.Menu.helpCmd:
				Mojo.Controller.stageController.pushScene('about', this.settings);
				break;
			}
		}
	},
});
