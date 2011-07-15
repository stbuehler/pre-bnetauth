var IdentitiesAssistant = Class.create({
	commandMenuModel : {
		items: [
		        { label: $L('New'), icon: 'new', submenu: 'enrollregions-submenu' },
		        ],
		visible: true,
	},

	enrollRegionsMenuModel: { label: 'Enroll', items: EnrollListRegions },

	initialize: function(settings) {
		this.settings = settings;
		this.model = { showTokens : false };
		
		this.onIdListPropertyChanged = this.onIdListPropertyChanged.bind(this);
		this.onIdListDelete = this.onIdListDelete.bind(this);
		this.onIdListReorder = this.onIdListReorder.bind(this);
		this.updateShowToken = this.updateShowToken.bind(this);
		/* this is the creator function for your scene assistant object. It will be passed all the 
		   additional parameters (after the scene name) that were passed to pushScene. The reference
		   to the scene controller (this.controller) has not be established yet, so any initialization
		   that needs the scene controller should be done in the setup function below. */
	},

	setup: function() {
		/* this function is for setup tasks that have to happen when the scene is first created */

		/* use Mojo.View.render to render view templates and add them to the scene, if needed */

		/* setup widgets here */
		this.controller.setupWidget(Mojo.Menu.commandMenu, { menuClass: 'palm-dark no-fade' }, this.commandMenuModel);

		this.controller.setupWidget('enrollregions-submenu', undefined, this.enrollRegionsMenuModel);

		/* add event handlers to listen to events from widgets */
		var appMenuModel = {
			visible: true,
			items: [
				Mojo.Menu.editItem,
				//{label: $L('Preferences'), command:'cmdSettings', disabled:false},
				{label: $L('Identities'), command:'cmdSettings', disabled:true},
				{label:$L('About'), command:Mojo.Menu.helpCmd, disabled:false}
			],
		};
		this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, appMenuModel);

		this.controller.setupWidget('toggleTokens', { modelProperty: 'showTokens' }, this.model);

		this.controller.setupWidget('idList', {
			itemTemplate: 'identities/identity',
			listTemplate: 'identities/identity-list',
			swipeToDelete: true,
			renderLimit: 40,
			reorderable: true,
		}, this.settings.model);

		this.controller.setupWidget('nameField', {
			modelProperty: 'name',
			enterSubmits: 'true',
		});
		this.controller.setupWidget('serialField', {
			modelProperty: 'serial',
			enterSubmits: 'true',
		});
		this.controller.setupWidget('tokenField', {
			modelProperty: 'token',
			multiline: 'true', 
			enterSubmits: 'true',
			textCase: Mojo.Widget.steModeLowerCase,
		});

		this.controller.listen('idList', Mojo.Event.propertyChanged, this.onIdListPropertyChanged);
		this.controller.listen('idList', Mojo.Event.listDelete, this.onIdListDelete);
		this.controller.listen('idList', Mojo.Event.listReorder, this.onIdListReorder);
		this.controller.listen('toggleTokens', Mojo.Event.propertyChange, this.updateShowToken);
	},

	activate: function(event) {
		/* put in event handlers here that should only be in effect when this scene is active. For
		   example, key handlers that are observing the document */
	},

	deactivate: function(event) {
		/* remove any event handlers you added in activate and do any other cleanup that should happen before
		   this scene is popped or another scene is pushed on top */
	},

	cleanup: function(event) {
		/* this function should do any cleanup needed before the scene is destroyed as 
		   a result of being popped off the scene stack */
		this.controller.stopListening('idList', Mojo.Event.propertyChanged, this.onIdListPropertyChanged);
		this.controller.stopListening('idList', Mojo.Event.listDelete, this.onIdListDelete);
		this.controller.stopListening('idList', Mojo.Event.listReorder, this.onIdListReorder);
		this.controller.stopListening('toggleTokens', Mojo.Event.propertyChange, this.updateShowToken);
	},

	scrollTo: function(element) {
		Mojo.View.getScrollerForElement(element).mojo.revealElement(element);
	},

	updateShowToken : function() {
		var i, l;
		if (this.model.showTokens) {
			l = document.getElementsByName('tokenHiddenField');
			for (i = 0; i < l.length; i++) l[i].hide();
			l = document.getElementsByName('tokenField');
			for (i = 0; i < l.length; i++) l[i].show();
		} else {
			l = document.getElementsByName('tokenHiddenField');
			for (i = 0; i < l.length; i++) l[i].show();
			l = document.getElementsByName('tokenField');
			for (i = 0; i < l.length; i++) l[i].hide();
		}
	},

	onIdListPropertyChanged: function(event) {
		// Mojo.Log.error('onIdListPropertyChanged: ' + event.type + ':' + event.property);
		if (event.type === Mojo.Event.propertyChange) {
			switch (event.property) {
			case 'name':
				event.model.nameSet(event.value);
				this.controller.modelChanged(this.settings.model);
				break;
			case 'serial': event.model.serialSet(event.value); break;
			case 'token': event.model.tokenSet(event.value); break;
			}
		}
	},
	
	onIdListDelete: function(event) {
		this.settings.identityDel(event.index);
	},
	onIdListReorder: function(event) {
		this.settings.identityMove(event.fromIndex, event.toIndex);
	},
	
	onEnrollFailure: function(failData) {
		Mojo.Log.error('bnetauth enroll failure: ' + JSON.stringify(failData));
		Mojo.Controller.errorDialog(failData.errorText);
	},
	handleCommand: function(event) {
		this.controller = Mojo.Controller.stageController.activeScene();

		if (event.type == Mojo.Event.command) {
			var cmd = event.command.split(' ');
			switch (cmd[0]) {
			case 'cmdEnrollCustom':
				this.settings.identityAdd('New', 'enter secret token', 'serial');
				this.controller.modelChanged(this.settings.model);
				// force showing tokens as you want to edit it right now
				this.model.showTokens = true;
				this.controller.modelChanged(this.model);
				this.updateShowToken();
				this.scrollTo($('bottomScroller'));
				break;
			case 'cmdEnrollRegion':
				var region = cmd.slice(1).join(' ')
				Mojo.Log.info('cmdEnrollRegion: "' + region + '": ' + JSON.stringify(event));
				Enroll(region, function (result) {
					Mojo.Log.info('bnetauth enroll success: ' + JSON.stringify(result));
					this.settings.identityAdd(region, result.token, result.serial);
					this.controller.modelChanged(this.settings.model);
					this.updateShowToken();
					this.scrollTo($('bottomScroller'));
				}.bind(this), this.onEnrollFailure.bind(this));
				break;
			case Mojo.Menu.helpCmd:
				Mojo.Controller.stageController.pushScene('about', this.settings);
				break;
			}
		}
	},
});
