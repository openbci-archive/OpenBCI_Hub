# v1.3.6

### Bug Fixes

* Application in production was not finding custom OpenBCI logo.

# v1.3.5

### Bug Fixes

* Daisy data did not send aux values

# v1.3.3/4

### Bug Fixes

* Update ganglion node driver to 1.0.0
* Stopped wifi scan in wifi cleanup
* Cleaned up event listeners for cyton/ganglion/wifi disconnect
* Fixed bug with daisy not getting accel data or stop byte by bumping wifi version to 0.3.0
* Daisy with cyton now get's stop bytes with bump to 1.0.6

# v1.3.2

### Bug Fixes

* SD card did not work for wifi on cyton

# v1.3.1

### Bug Fixes

* Removed annoying pop-up on windows

# v1.3.0

### Bug Fixes

* Issue with ganglion channel data not sent
* Issue where cyton aux data not sent

### Breaking Changes

* Ganglion data over wifi has only 4 channels (as it's supposed to)
* Ganglion accel data over wifi sent with packet instead of in separate packet to prevent misalignment.

# v1.2.0

Fixing bugs with AppVeyor build service.

# v1.1.3

### Bug Fixes

* Fixed bugs with process protocol and several others.

# v1.1.2

Add a lot more fixes.

# v1.1.0

Add a lot more fixes.

# v1.0.2

Fix many issues with cyton and ganglion and wifi.

# v1.0.1

Add channel setting commands.

# v1.0.0

Add cyton and wifi support

# v0.4.1

### New Features
* BLE error on start up now sends error

### Bug Fixes
* Fixes #12 - Absorb 'no valid USB' found and send log

# v0.4.0

### Breaking Changes
* Changed name of built app from `Ganglion Hub` to `GanglionHub`.

### Bug Fixes
* On client leave if ganglion is connected, the connection will close.

# v0.3.1

### Enhancements
* Building the proper builds by tweaking appveryor.

# v0.3.0

### Enhancements
* Standardization of Specification.

### Breaking changes
* Accelerometer, Impedance, and Sample data all have specific success error codes: 202, 203, and 204 respectively. Prior to this version all were using the same 200 code.

# v0.2.3

### Enhancements
* Calling connect with device name now performs a scan to ensure that device is really still available to connect to.

### Bug Fixes
* Calling connect with timeout caused another bug, for timeout.

# v0.2.2

### Enhancements
* Bump `openbci-ganglion` to `0.4.1`.
* Calling connect now has a timeout!

### Bug Fixes
* Dropped connections now eject a message out to connected client.

# v0.2.1

### Bug Fixes
* `ganglionFound` event emitter was not removed on start of new scan.

### Enhancements
* Disabled verbose print out for production build.
* Bump `openbci-ganglion` to `0.3.8`.

# v0.2.0

### Bug Fixes
* Disconnect did not clean up event emitters added in connect.

### Enhancements
* Bump `openbci-ganglion` to `0.3.7`

# v0.1.6

### Enhancements
* Bump `openbci-ganglion` to `0.3.6`

### Bug Fixes
* Ganglion would not disconnect.
* Change Appveyor to Node 6

# v0.1.5

### Enhancements
* Bump `openbci-ganglion` to `0.3.3`

### Bug Fixes
* Ganglion could not stop seaching.

# v0.1.4

### New Features
* Add Accel

### Bug Fixes
* Ganglion could not connect twice.

# v0.1.3

### Bug Fixes
* Add accelerometer data flow
* Bump ganglion node to `0.3.0`

# v0.1.2

### Bug Fixes
* Fix bug with undefined impedance

# v0.1.1

### Enhancements
* Update to use 18 bit compression.
* Update to v0.2.0 of `openbci-ganglion`.
* Fix bug in impedance sending.

# v0.1.0

* Initial Release
