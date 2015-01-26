chrome.app.runtime.onLaunched.addListener(function(input) {
	// If there is no app window then this is the first `onLaunched` event.
	// In that case create an app window and set file input if nessesary.
	if (chrome.app.window.getAll().length === 0) {
		chrome.app.window.create('index.html', {
			resizable: true,
			width:800,
			height:600
		}, function(appWindow) {
			if (input && input.hasOwnProperty('items') && input.items[0]) {
				// Set a reference to the file that launched the app so that
				// the window can pick it up after it has loaded.
				this.launchFileEntry = input.items[0].entry
			}
		})
	}
})
