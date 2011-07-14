
all:

package:
	palm-package bnetauth.application bnetauth.srv bnetauth.package

install:
	# removing deletes cookies
	# -palm-install -r de.stbuehler.bnetauth
	palm-install de.stbuehler.bnetauth_*_all.ipk

debuglaunch:
	# palm-log --system-log-level info
	palm-launch -f -i de.stbuehler.bnetauth

launch:
	palm-launch de.stbuehler.bnetauth

run: package install debuglaunch

.PHONY: all package install launch run
