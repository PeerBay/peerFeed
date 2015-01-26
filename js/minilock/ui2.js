(function(){
'use strict';

miniLock.UI = {}

// Automatically setup and start the onscreen interface when the
// 'startOnLoad' class is present on <body>. Guards against running
// setup and start functions in the test kit.
$(window).load(function() {
	if ($(document.body).hasClass('startOnLoad')) {
		miniLock.UI.setup()
		miniLock.UI.start()
		// Pickup file input in Chrome App processes.
		if (window.chrome && window.chrome.runtime) {
			window.chrome.runtime.getBackgroundPage(function(process){
				// If the process was launched with a file...
				if (process.launchFileEntry) {
					// Set miniLock.session.launchFile to an instance of File so that it
					// can be decrypted immediately after miniLock is unlocked.
					process.launchFileEntry.file(function(file){
						miniLock.session.launchFile = file
					})
				}
			})
		}
	}
})


// UI Startup
miniLock.UI.start = function() {
	$('[data-utip]').utip()
	$('input.miniLockEmail').focus()
	$('span.dragFileInfo').html(
		$('span.dragFileInfo').data('select')
	)
}

// - - - - - - - - - - - -
// Bind to Events
miniLock.UI.setup = function() {

// -----------------------
// Unlock UI Bindings
// -----------------------
	
	$('input.showMiniLockKey').on('click', function() {
		if ($('input.miniLockKey').attr('type') === 'password') {
			$('input.miniLockKey').attr('type', 'text')
		}
		else {
			$('input.miniLockKey').attr('type', 'password')
		}
	})
	
	$('form.unlockForm').on('submit', function() {
		var emailMatch = new RegExp(
			'[-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\\.[a-zA-Z]{2,20}'
		)
		var email = $('input.miniLockEmail').val()
		miniLock.domain = email.replace(/\..*/,"").replace(/.*@/, "");
		miniLock.username = email.replace(/@.*/, "")
		var key   = $('input.miniLockKey').val()
		if (!email.length || !emailMatch.test(email)) {
			$('div.unlockInfo').text($('div.unlockInfo').data('bademail'))
			$('input.miniLockEmail').select()
			return false
		}
		if (!key.length) {
			$('div.unlockInfo').text($('div.unlockInfo').data('nokey'))
			$('input.miniLockKey').select()
			return false
		}
		if (miniLock.crypto.checkKeyStrength(key, email)) {
			$('input.miniLockKey').attr('type', 'password')
			$('div.unlock').animate({marginTop: 90})
			$('div.unlockInfo').animate({height: 20})
			$('div.unlockInfo').text($('div.unlockInfo').data('keyok'))
			$('input.miniLockKey').attr('readonly', 'readonly')
			miniLock.crypto.getKeyPair(key, email, function(keyPair) {
				miniLock.session.keys = keyPair
				miniLock.session.keyPairReady = true
			})
			// Keep polling until we have a key pair
			var keyReadyInterval = setInterval(function() {
				if (miniLock.session.keyPairReady) {
					clearInterval(keyReadyInterval)
					$('div.myMiniLockID code').text(
						miniLock.crypto.getMiniLockID(
							miniLock.session.keys.publicKey
						)
					)
					$('div.unlock').delay(200).fadeOut(200, function() {
						$('div.postForm').fadeIn(200)
						$('div.squareFront').animate({
							backgroundColor: '#7090ad'
						})
								if ($('form.process div.blank.identity').size() === 0) {
						for (var i = 0; i < 4; i++) {
								$('form.process div.miniLockIDList').append(Mustache.render(
									miniLock.templates.recipientListIdentity,
									{'className': 'blank'}
								))
							}
						}
						if ($('form.process div.blank.identity').size() === $('form.process div.identity').size()) {
							var myMiniLockID = miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
							var simpleID=myMiniLockID.toLowerCase().match(/[a-z]/g).join()
							//~ $.couch.urlPrefix = domain+".iriscouch.com/";
							$.couch.urlPrefix = "https://"+miniLock.domain+".couchappy.com";
							// credentials db(public) contains documents in the form of
							//~ {
								//~ _id:domain name encrypted with user's public key
								//~ credentials: random generated username and password encrypted with users public key
							//~ }
							// these are used to login and create or replicate the user's db(minilockID) data in browser and decrypt
							
							//~ miniLock.fixAdmin()
							//~ $.couch.db("credentials").openDoc(simpleID, {
							    //~ success: function(data) {
							        //~ console.log(data);
							        //~ miniLock.session.couchCredentials
							    //~ },
							    //~ error: function(status) {
							        //~ console.log(status);
							    //~ }
							//~ });
							miniLock.admin.fixAdmin()
							
							$('form.process div.blank.identity:first-child').replaceWith(Mustache.render(
								miniLock.templates.recipientListIdentity,
								{'className': 'session', 'id': myMiniLockID, 'label': 'Me'}
							))
						}
					})
					
				}
			}, 100)
		}
		else {
			$('div.unlockInfo').html(
				Mustache.render(
					miniLock.templates.keyStrengthMoreInfo,
					{
						phrase: miniLock.phrase.get(7)
					}
				)
			)
			$('div.unlock').animate({marginTop: 50})
			$('div.unlockInfo').animate({height: 190})
			$('div.unlockInfo input[type=text]').unbind().click(function() {
				$(this).select()
			})
			$('div.unlockInfo input[type=button]').unbind().click(function() {
				$('div.unlockInfo input[type=text]').val(
					miniLock.phrase.get(7)
				)
			})
		}
		return false
	})

	$('input.fileSelectDialog').change(function(e) {
		e.preventDefault()
		if (!this.files) {
			return false
		}
	
		var file = this.files[0]
		console.log(file)
		// Pause to give the operating system a moment to close its
		// file selection dialog box so that the transition to the
		// next screen will be smoother.
		setTimeout(function(){
			miniLock.UI.handleFileSelection(file)
		}, 600)
		return false
	})

	// Press <return>, or click > to commit the form and begin encrypting.
	$('form.process').on('submit', function(event) {
		$('#utip').hide()
		event.preventDefault()
		var message=$(".posttext").val()
		console.log(message)
		if ($('div.blank.identity').size() === $('div.identity').size()) {
			$('div.identity input').first().focus()
		}
		else if ($('div.invalid.identity').size()) {
			$('div.invalid.identity input').first().focus()
		}
		else {

			var miniLockIDs = $('div.identity:not(.blank) input[type=text]').map(function() {
				return this.value.trim()
			}).toArray()
			console.log(miniLock.session.currentFile.fileObject)
			if (miniLock.session.currentFile.fileObject!=null){
				var outputName = $('form.process div.output.name input').val().trim()
				
				miniLock.crypto.encryptFile(
					miniLock.session.currentFile.fileObject,
					outputName,
					miniLockIDs,
					miniLock.crypto.getMiniLockID(
						miniLock.session.keys.publicKey
					),
					miniLock.session.keys.secretKey,
					miniLock.crypto.encryptionCompleteCallback
				)
				$('form.process').trigger('encrypt:start', miniLock.session.currentFile.fileObject.size)
			}
			if(message!=""){
				miniLock.crypto.encryptMessage(
					message,
					miniLockIDs,
					miniLock.crypto.getMiniLockID(
						miniLock.session.keys.publicKey
					),
					miniLock.session.keys.secretKey,
					miniLock.crypto.encryptedMessageCallback
				)
				
			}
			
		}
	})
	
	$('form.process').on('encrypt:setup', function(event, file) {
		$('form.process').removeClass(miniLock.UI.resetProcessFormClasses)
		$('form.process').addClass('unprocessed')
		var originalName = file.name
		var inputName	= file.name
		var randomName   = miniLock.util.getRandomFilename()
		//~ var outputName   = $('form.process').hasClass('withRandomName') ? randomName : originalName
		var outputName   = randomName
		//~ miniLock.UI.renderAllFilenameTags({
			//~ 'input':	inputName,
			//~ 'output':   outputName,
			//~ 'original': originalName,
			//~ 'random':   randomName
		//~ })
		//~ if ($('form.process').hasClass('withRandomName')) {
			//~ $('form.process div.random.name').addClass('activated')
			//~ $('form.process div.original.name').addClass('shelved')
		//~ }
		//~ else {
			//~ $('form.process div.output.name').addClass('activated')
		//~ }
		// Render the size of the input file.
		$('form.process a.fileSize').html(miniLock.UI.readableFileSize(file.size))
		// Insert the sender's miniLock ID if the list is empty.

		$('form.process div.blank.identity input[type=text]').first().focus()
		var withoutMyMiniLockID = $('form.process div.session.identity:not(.expired)').size() === 0
		$('form.process').toggleClass('withoutMyMiniLockID', withoutMyMiniLockID)
		$('form.process input.encrypt').prop('disabled', false)
	})

	$('form.process').on('encrypt:start', function(event, fileSize) {
		$('form.process').removeClass('unprocessed')
		$('form.process').addClass('encrypting')
		$('input.encrypt').prop('disabled', true)
		miniLock.UI.animateProgressBar(0, fileSize)
	})
	$('form.process').on('encryptMessage:complete', function(event, json) {
		console.log("stored",json)
		miniLock.session.userDB.put(json,PouchDB.utils.uuid()).then(function(response) {console.log(response) });
	
	})
	// Set the screen to save an encrypted file.
	$('form.process').on('encrypt:complete', function(event, file) {
		$('form.process').removeClass('encrypting')
		$('form.process').addClass('encrypted')
		// Render encrypted file size.
		$('form.process a.fileSize').text(miniLock.UI.readableFileSize(file.size))
		// Render link to save encrypted file.
		console.log(file)
		miniLock.UI.renderLinkToSaveFile(file)
		// Render identity of the sender.
		$('form.process div.senderID code').text(file.senderID)
		// Summarize who can access the file.
		var recipientIDs = $('form.process div.identity:not(.blank) input[type=text]').map(function() {
			return this.value.trim()
		}).toArray()
		var myMiniLockID = miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
		var recipientsSummary = miniLock.UI.summarizeRecipients(recipientIDs, myMiniLockID)
		if (
			recipientsSummary.senderCanDecryptFile
		) {
			if (recipientsSummary.totalRecipients > 0) {
				$('form.process div.summary').text(
					'File can be decrypted by its sender and '
					+ recipientsSummary.totalRecipients + ' recipient(s).'
				)
			}
			else {
				$('form.process div.summary').text(
					'File can be decrypted by its sender only.'
				)
			}
		}
		else if (recipientsSummary.totalRecipients > 0) {
			$('form.process div.summary').text(
				'File can be decrypted by '
				+ recipientsSummary.totalRecipients + ' recipient(s).'
			)
		}
	})
	
	// Display encryption error message, reset progress bar, and then flip back.
	$('form.process').on('encrypt:failed', function(event, errorCode) {
		$('form.process').removeClass('encrypting')
		$('form.process').addClass('encrypt failed')
		$('form.process div.failureNotice').text(
			$('form.process div.failureNotice').data('error-' + errorCode)
		)
		$('form.process div.progressBarFill').css({
			'width': '0',
			'transition': 'none'
		})
		setTimeout(function() {
			miniLock.UI.flipToFront()
		}, 7500)
	})
	

}

miniLock.UI.handleDirectorySelection = function(directory) {
	$('span.dragFileInfo').html(
		$('span.dragFileInfo').data('zip')
	)
	var walk = function(dir, done) {
		var results = []
		dir.createReader().readEntries(function(list) {
			var pending = list.length
			if (!pending) {
				return done(results, null)
			}
			list.forEach(function(l) {
				if (l.isDirectory) {
					walk(l, function(res) {
						results = results.concat(res)
						if (!--pending) {
							done(results, null)
						}
					})
				}
				else {
					l.file(function(file) {
						var reader = new FileReader()
						reader.onload = function() {
							results.push({
								// Using slice for making relative path from absolute one
								// This make miniLock more portable as told by users of Windows
								path: l.fullPath.slice(1),
								content: reader.result
							})
							if (!--pending) {
								done(results, null)
							}
						}
						reader.readAsArrayBuffer(file)
					})
				}
			})
		}, function(err) {
			return done(err)
		})
	}
	// Walk through the tree, then zip the result
	// and call handleFileSelection using it as
	// the file to encrypt
	walk(directory, function(res, err) {
		if (err) {
			throw err
		}
		var zip = new JSZip()
		res.forEach(function(r) {
			zip.file(r.path, r.content)
		})
		var archive = new Blob([zip.generate({type: 'blob'})], {})
		// We add a name attribute to our archive such to
		// fake handleFileSelection dealing with a true File,
		// not a Blob
		archive.name = directory.name + '.zip'
		$('span.dragFileInfo').html(
			$('span.dragFileInfo').data('read')
		)
		miniLock.UI.handleFileSelection(archive)
	})
}

// Handle file selection via drag/drop, select dialog or OS launch.
miniLock.UI.handleFileSelection = function(file) {
	miniLock.util.resetCurrentFile()
	miniLock.session.currentFile.fileObject = file
	var miniLockFileYes = new Uint8Array([
		0x6d, 0x69, 0x6e, 0x69,
		0x4c, 0x6f, 0x63, 0x6b
	])
	var operation = 'decrypt'
	miniLock.file.read(miniLock.session.currentFile.fileObject, 0, 8, function(result) {
		for (var i = 0; i < result.data.length; i++) {
			if (result.data[i] !== miniLockFileYes[i]) {
				operation = 'encrypt'
			}
		}
		setTimeout(function() {
			$('span.dragFileInfo').html(
				$('span.dragFileInfo').data('select')
			)
		}, 1000)
		if (operation === 'encrypt') {
			$('form.process').trigger('encrypt:setup', miniLock.session.currentFile.fileObject)
		}
		if (operation === 'decrypt') {
			miniLock.crypto.decryptFile(
				miniLock.session.currentFile.fileObject,
				miniLock.crypto.getMiniLockID(
					miniLock.session.keys.publicKey
				),
				miniLock.session.keys.secretKey,
				miniLock.crypto.decryptionCompleteCallback
			)
			$('form.process').trigger('decrypt:start', {
				name: miniLock.session.currentFile.fileObject.name,
				size: miniLock.session.currentFile.fileObject.size
			})
		}
		
	}, function() {
		$('span.dragFileInfo').html(
			$('span.dragFileInfo').data('error')
		)
	})
}



miniLock.UI.resetProcessFormClasses = ''
	+ 'unprocessed withSuspectFilename withoutMyMiniLockID '
	+ 'encrypting decrypting '
	+ 'encrypted decrypted '
	+ 'encrypt decrypt failed '

miniLock.UI.renderAllFilenameTags = function(filenames){
	$('form.process div.name').removeClass('activated shelved expired')
	$('form.process div.name input').val('')
	$('form.process div.name h1').empty()
	miniLock.UI.renderFilenameTag('input',	filenames.input)
	miniLock.UI.renderFilenameTag('output',   filenames.output)
	miniLock.UI.renderFilenameTag('original', filenames.original)
	miniLock.UI.renderFilenameTag('random',   filenames.random)
}

miniLock.UI.renderFilenameTag = function(className, filename){
	$('form.process div.'+className+'.name input').val(filename)
	$('form.process div.'+className+'.name h1').html(Mustache.render(
		miniLock.templates.filename,
		miniLock.UI.getBasenameAndExtensions(filename)
	))
}

miniLock.UI.renderLinkToSaveFile = function(file) {
	window.URL = window.webkitURL || window.URL
	$('a.fileSaveLink').attr('download', file.name)
	$('a.fileSaveLink').attr('href', window.URL.createObjectURL(file.data))
	$('a.fileSaveLink').data('downloadurl', [
		file.type,
		$('a.fileSaveLink').attr('download'),
		$('a.fileSaveLink').attr('href')
	].join(':'))
	$('a.fileSaveLink').css('height', $('form.process div.activated.name h1').height())
	$('a.fileSaveLink').css('visibility', 'visible')
}

miniLock.UI.expireLinkToSaveFile = function() {
	window.URL = window.webkitURL || window.URL
	window.URL.revokeObjectURL($('a.fileSaveLink')[0].href)
	$('a.fileSaveLink').attr('download', '')
	$('a.fileSaveLink').attr('href', '')
	$('a.fileSaveLink').data('downloadurl', '')
	$('a.fileSaveLink').css('height', 0)
	$('a.fileSaveLink').css('visibility', 'hidden')
}

// Input: Object:
//	{
//		name: File name,
//		size: File size (bytes),
//		data: File data (Blob),
//		type: File MIME type
//	}
//	operation: 'encrypt' or 'decrypt'
//	senderID: Sender's miniLock ID (Base58)
miniLock.UI.fileOperationIsComplete = function(file, operation, senderID) {
	// It seems we're limited with the number of arguments we can pass here.
	file.senderID = senderID
	$('form.process').trigger(operation + ':complete', file)
}
miniLock.UI.messageOperationIsComplete = function(json, operation, senderID) {
	// It seems we're limited with the number of arguments we can pass here.
	json.senderID = senderID
	$('form.process').trigger(operation + ':complete', json)
}

// The crypto worker calls this method when a
// decrypt or encrypt operation has failed.
// Operation argument is either 'encrypt' or 'decrypt'.
miniLock.UI.fileOperationHasFailed = function(operation, errorCode) {
	$('form.process').trigger(operation+':failed', errorCode)
}

// Convert an integer from bytes into a readable file size.
// For example, 7493 becomes '7KB'.
miniLock.UI.readableFileSize = function(bytes) {
	var KB = bytes / 1024
	var MB = KB	/ 1024
	var GB = MB	/ 1024
	if (KB < 1024) {
		return Math.ceil(KB) + 'KB'
	}
	else if (MB < 1024) {
		return (Math.round(MB * 10) / 10) + 'MB'
	}
	else {
		return (Math.round(GB * 10) / 10) + 'GB'
	}
}

// Animate progress bar based on currentProgress and total.
miniLock.UI.animateProgressBar = function(currentProgress, total) {
	var percentage = total ? currentProgress / total * 100 : 0
	// If percentage overflows 100 due to chunkSize greater
	// than the size of the file itself, set it to 100
	percentage = percentage > 100 ? 100 : percentage
	$('form.process div.progressBarFill').css({
		'transition': 'none'
	})
	setTimeout(function(){
		$('form.process div.progressBarFill').css({
			'width': percentage + '%',
			'transition': 'width 1ms linear'
		})
	}, 1)
}

// Input: Filename (String), Offset (Number)
// Output: Object consisting of basename and extensions.
miniLock.UI.getBasenameAndExtensions = function(filename) {
	var pattern = /\.\w+$/
	var basename = filename + ''
	var extensions = []
	while (pattern.test(basename)) {
		extensions.unshift(basename.match(pattern)[0])
		basename = basename.replace(pattern, '')
	}
	return {
		'basename': basename,
		'extensions': extensions.join('')
	}
}

// Input: Recipient IDs (Array), sender's miniLock ID (String)
// Output: {
//	senderCanDecryptFile: Whether sender can decrypt file (Boolean),
//	totalRecipients: Number of total recipients, not including sender, if applicable (Number)
// }
miniLock.UI.summarizeRecipients = function(recipientIDs, myMiniLockID) {
	var totalRecipients	  = recipientIDs.length
	var senderCanDecryptFile = recipientIDs.indexOf(myMiniLockID) === -1 ? false : true
	if (senderCanDecryptFile) {
		totalRecipients--
	}
	return {
		senderCanDecryptFile: senderCanDecryptFile,
		totalRecipients: totalRecipients
	}
}

miniLock.UI.isDuplicateID = function(miniLockID) {
	var miniLockIDs = $('div.identity:not(.blank) input[type=text]').map(function() {
		return this.value.trim()
	}).toArray()
	for (var i = 0, counter = 0; i < miniLockIDs.length; i++) {
		if (miniLockIDs[i] === miniLockID) {
			counter++
		}
	}
	return counter > 1 ? true : false
}

// needed for compatibility between couch.jquery and jquery 1.9
jQuery.browser = {};
(function () {
    jQuery.browser.msie = false;
    jQuery.browser.version = 0;
    if (navigator.userAgent.match(/MSIE ([0-9]+)\./)) {
        jQuery.browser.msie = true;
        jQuery.browser.version = RegExp.$1;
    }
})();
// Design & Developer Tools
// -----------------------

// Uncomment the following to unlock a demo session automatically.

 $(window).load(function() {
	if ($(document.body).hasClass('startOnLoad')) {
		$('input.miniLockEmail').val('vasilis@peerbay.net')
		$('input.miniLockKey').val('Sometimes miniLock people use this key when they are working on the software')
		$('form.unlockForm').submit()
	}
	
}) 
miniLock.renderText=function(text,id){
	
	var target = document.getElementById(id);
	$(target).append('<canvas class="canvas" style="border:2px solid black;" width="200" height="200"></canvas>')
	var canvas =$(target).find("canvas")[0]
	var ctx = canvas.getContext('2d');
	
	var data = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
	           '<foreignObject width="100%" height="100%">' +
	           '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px">' +
	              text+
	           '</div>' +
	           '</foreignObject>' +
	           '</svg>';
	
	var DOMURL = window.URL || window.webkitURL || window;
	
	var img = new Image();
	var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
	var url = DOMURL.createObjectURL(svg);
	
	img.onload = function () {
	  ctx.drawImage(img, 0, 0);
	  DOMURL.revokeObjectURL(url);
	}
	
	img.src = url;
	
	}
})()

