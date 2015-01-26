miniLock.templates = {}

miniLock.templates.keyStrengthMoreInfo = ''
	+ 'The passphrase you have entered is too weak.'
	+ '<p>Having a long, unique key is very important for using miniLock. '
	+ 'Try using a <strong>phrase</strong> that makes sense only to you.<br /><br />'
	+ 'We strongly recommend allowing miniLock to generate a key for you:<br />'
	+ '<input type="text" value="{{phrase}}" spellcheck="false" readonly="readonly" />'
	+ '<input type="button" value="Get another phrase" /></p>'

miniLock.templates.recipientListIdentity = ''
	+ '<div class="{{className}} identity" data-me="Me" data-invalid="Invalid" data-duplicate="Duplicate">'
	+ 	'<label>{{label}}</label>'
	+ 	'<input class="code" type="text" placeholder="Add another miniLock ID" value="{{id}}" spellcheck="false" />'
	+ 	'<input class="remove" type="button" value="&#xf081;" tabindex="-1" />'
	+ '</div>'

miniLock.templates.filename = ''
	+ '<b class="basename">{{basename}}</b>'
	+ '<span class="spaceToAllowWordWrapOnExtensions"> </span>'
	+ '<span class="extensions">{{extensions}}</span>'
	+ '<span class="spaceToAllowWordWrapOnExtensions"> </span>'
	+ '<span class="miniLockExtension">.minilock</span>'
