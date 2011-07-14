var mainstage;

var StageAssistant = Class.create({
	initialize: function (controller) {
		mainstage = this;
		/* this is the creator function for your stage assistant object */
		controller.enableManualSplashScreenMode();
	},
	
	setup: function() {
		/* this function is for setup tasks that have to happen when the stage is first created */
		this.controller.setWindowOrientation("free");
		
		EnrollListRegionsLoad(this.load1.bind(this));
	},
	
	load1: function() {
		this.settings = new Settings(this.load2.bind(this));
	},
	
	load2: function() {
		this.controller.pushScene({name: "main"}, this.settings);
		if (0 == this.settings.identitiesGet().length) {
			this.controller.pushScene("identities", this.settings);
		}
		this.controller.hideSplashScreen();
	},
});
