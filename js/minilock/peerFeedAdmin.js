//~ First user login. We inform the user that he/she is the administrator of
//~ this node. 
miniLock.admin={}

miniLock.requestAccount=function(){
	myMiniLockID=miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
	
	Base58.decode(miniLockIDs[i]).subarray(0, 32)
	var doc = {"_id":myMiniLockID,"cipher":cipherWord,"nonce":adminNonce};
	$.couch.db("requests").saveDoc(doc, {
	    success: function(data) {
	        console.log(data);
	    },
	    error: function(status) {
	        console.log(status);
	    }
	});
		
}	

miniLock.filter={
  outgoing: function (header) {
	 var mySecretKey=miniLock.session.keys.secretKey
    // do something to the document before storage
    // decrypt cipher to doc
    if (
		!header.hasOwnProperty('ephemeral')
		|| !miniLock.util.validateEphemeral(header.ephemeral)
	) {
		throw new Error('miniLock: Decryption failed - could not parse header')
		return {"error":"Decryption failed - could not parse header"}
	}
	// Attempt decryptInfo decryptions until one succeeds
	var actualDecryptInfo      = null
	var actualDecryptInfoNonce = null
	var actualMessageInfo         = null
	for (var i in header.decryptInfo) {
		if (
			({}).hasOwnProperty.call(header.decryptInfo, i)
			&& miniLock.util.validateNonce(i, 24)
		) {
			actualDecryptInfo = nacl.box.open(
				nacl.util.decodeBase64(header.decryptInfo[i]),
				nacl.util.decodeBase64(i),
				nacl.util.decodeBase64(header.ephemeral),
				mySecretKey
			)
			if (actualDecryptInfo) {
				actualDecryptInfo = JSON.parse(
					nacl.util.encodeUTF8(actualDecryptInfo)
				)
				actualDecryptInfoNonce = nacl.util.decodeBase64(i)
				break
			}
		}
	}
	if (
		!actualDecryptInfo
		|| !({}).hasOwnProperty.call(actualDecryptInfo, 'recipientID')
		|| actualDecryptInfo.recipientID !== myMiniLockID
	) {
		throw new Error('miniLock: Decryption failed - File is not encrypted for this recipient')
		return {"error":"Decryption failed - File is not encrypted for this recipient'"}
	}
	if (
		!({}).hasOwnProperty.call(actualDecryptInfo, 'messageInfo')
		|| !({}).hasOwnProperty.call(actualDecryptInfo, 'senderID')
		|| !miniLock.util.validateID(actualDecryptInfo.senderID)
	) {
		throw new Error('miniLock: Decryption failed - could not validate sender ID')
		return {"error":"Decryption failed - could not validate sender ID"}
	}
	try {
		actualMessageInfo = nacl.box.open(
			nacl.util.decodeBase64(actualDecryptInfo.messageInfo),
			actualDecryptInfoNonce,
			Base58.decode(actualDecryptInfo.senderID).subarray(0, 32),
			mySecretKey
		)
		actualMessageInfo = JSON.parse(
			nacl.util.encodeUTF8(actualMessageInfo)
		)
	}
	catch(err) {
		throw new Error('miniLock: Decryption failed - could not parse header')
		return {"error":"Decryption failed - could not parse header"}
	}
	var doc=nacl.secretbox.open(
		nacl.util.decodeBase64(header.cipher),
		nacl.util.decodeBase64(actualMessageInfo.messageNonce),
		nacl.util.decodeBase64(actualMessageInfo.messageKey)
	)
	console.log(doc)
    return JSON.parse(
		nacl.util.encodeUTF8(doc)
		);
  },
  incoming: function (doc) {
    // do something to the document after retrieval
    // encrypt doc based on friend's ids and add replications filters
    //~ {
		//~ miniLockIDs:[myMiniLockID],
		//~ myMiniLockID:myMiniLockID,
		//~ mySecretKey:miniLock.session.keys.secretKey,
		//~ message:{title:"hi",body:"my name is hello.. :P"}
	//~ }
	var header = {}
	header.decryptInfo={}
	var miniLockIDs=doc.miniLockIDs
	var myMiniLockID=doc.myMiniLockID
	var mySecretKey=nacl.util.decodeBase64(doc.mySecretKey)
	var message=nacl.util.decodeUTF8(
		JSON.stringify(doc.message)
	)
	
	var messageKeypair=nacl.box.keyPair()
	var messageKey=nacl.util.encodeBase64(messageKeypair.secretKey)
	var messageNonce=miniLock.crypto.getNonce()
	var messageHash=nacl.util.encodeBase64(
					nacl.hash(message)
				)
	header.ephemeral=nacl.util.encodeBase64(messageKeypair.publicKey)
	header.cipher=nacl.util.encodeBase64(nacl.secretbox(message, messageNonce, messageKeypair.secretKey))
	var decryptInfoNonces = []
	for (var u = 0; u < miniLockIDs.length; u++) {
		decryptInfoNonces.push(
			miniLock.crypto.getNonce()
		)
	}
	for (var i = 0; i < miniLockIDs.length; i++) {
		var decryptInfo = {
			senderID: myMiniLockID,
			recipientID: miniLockIDs[i],
			messageInfo: {
				messageKey: messageKey,
				messageNonce: nacl.util.encodeBase64(messageNonce),
				messageHash: messageHash
			}
		}
		
		console.log(
			nacl.util.decodeUTF8(JSON.stringify(decryptInfo.messageInfo)),
			decryptInfoNonces[i],
			Base58.decode(miniLockIDs[i]).subarray(0, 32),
			mySecretKey
		)
		decryptInfo.messageInfo = nacl.util.encodeBase64(nacl.box(
			nacl.util.decodeUTF8(JSON.stringify(decryptInfo.messageInfo)),
			decryptInfoNonces[i],
			Base58.decode(miniLockIDs[i]).subarray(0, 32),
			mySecretKey
		))
		console.log(decryptInfo)
		decryptInfo = nacl.util.encodeBase64(nacl.box(
			nacl.util.decodeUTF8(JSON.stringify(decryptInfo)),
			decryptInfoNonces[i],
			Base58.decode(miniLockIDs[i]).subarray(0, 32),
			messageKeypair.secretKey
		))
		
		header.decryptInfo[
			nacl.util.encodeBase64(decryptInfoNonces[i])
		] = decryptInfo
	}
	
	console.log(header)
    return header;
  }
}	

miniLock.login=function(){
	myMiniLockID=miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
	$.couch.db("credentials").openDoc("admin", {
	    success: function(data) {
			adminPublicKey=Base58.decode(data.miniLockID).subarray(0, 32)
			$.couch.db("credentials").openDoc(myMiniLockID, {
			    success: function(data) {
					cipher=nacl.util.decodeBase64(data.cipher)
					nonce=nacl.util.decodeBase64(data.nonce)
			        console.log(data);
			        credentials=nacl.box.open(cipher,nonce,adminPublicKey,miniLock.session.keys.secretKey)
			        credentials=nacl.util.encodeUTF8(credentials)
					couchName=credentials.substring(0,credentials.length/2)
					couchPassword=credentials.substring(credentials.length/2)
					
					$.couch.login({
					    name: couchName,
					    password: couchPassword,
					    success: function(data) {
					        console.log(data);
					        miniLock.session.publicDB=new PouchDB(miniLock.domain+"/p-"+myMiniLockID.toLowerCase())
							miniLock.session.secretDB=new PouchDB(miniLock.domain+"/s-"+myMiniLockID.toLowerCase())
							miniLock.session.secretDB.filter({
							  outgoing: function (header) {
								 var mySecretKey=miniLock.session.keys.secretKey
							    // do something to the document before storage
							    // decrypt cipher to doc
							    if (
									!header.hasOwnProperty('ephemeral')
									|| !miniLock.util.validateEphemeral(header.ephemeral)
								) {
									throw new Error('miniLock: Decryption failed - could not parse header')
									return {"error":"Decryption failed - could not parse header"}
								}
								// Attempt decryptInfo decryptions until one succeeds
								var actualDecryptInfo      = null
								var actualDecryptInfoNonce = null
								var actualMessageInfo         = null
								for (var i in header.decryptInfo) {
									if (
										({}).hasOwnProperty.call(header.decryptInfo, i)
										&& miniLock.util.validateNonce(i, 24)
									) {
										actualDecryptInfo = nacl.box.open(
											nacl.util.decodeBase64(header.decryptInfo[i]),
											nacl.util.decodeBase64(i),
											nacl.util.decodeBase64(header.ephemeral),
											mySecretKey
										)
										if (actualDecryptInfo) {
											actualDecryptInfo = JSON.parse(
												nacl.util.encodeUTF8(actualDecryptInfo)
											)
											actualDecryptInfoNonce = nacl.util.decodeBase64(i)
											break
										}
									}
								}
								if (
									!actualDecryptInfo
									|| !({}).hasOwnProperty.call(actualDecryptInfo, 'recipientID')
									|| actualDecryptInfo.recipientID !== myMiniLockID
								) {
									throw new Error('miniLock: Decryption failed - File is not encrypted for this recipient')
									return {"error":"Decryption failed - File is not encrypted for this recipient'"}
								}
								if (
									!({}).hasOwnProperty.call(actualDecryptInfo, 'messageInfo')
									|| !({}).hasOwnProperty.call(actualDecryptInfo, 'senderID')
									|| !miniLock.util.validateID(actualDecryptInfo.senderID)
								) {
									throw new Error('miniLock: Decryption failed - could not validate sender ID')
									return {"error":"Decryption failed - could not validate sender ID"}
								}
								try {
									actualMessageInfo = nacl.box.open(
										nacl.util.decodeBase64(actualDecryptInfo.messageInfo),
										actualDecryptInfoNonce,
										Base58.decode(actualDecryptInfo.senderID).subarray(0, 32),
										mySecretKey
									)
									actualMessageInfo = JSON.parse(
										nacl.util.encodeUTF8(actualMessageInfo)
									)
								}
								catch(err) {
									throw new Error('miniLock: Decryption failed - could not parse header')
									return {"error":"Decryption failed - could not parse header"}
								}
								var doc=nacl.secretbox.open(
									nacl.util.decodeBase64(header.cipher),
									nacl.util.decodeBase64(actualMessageInfo.messageNonce),
									nacl.util.decodeBase64(actualMessageInfo.messageKey)
								)
								console.log(doc)
							    return JSON.parse(
									nacl.util.encodeUTF8(doc)
									);
							  },
							  incoming: function (doc) {
							    // do something to the document after retrieval
							    // encrypt doc based on friend's ids and add replications filters
							    //~ {
									//~ miniLockIDs:[myMiniLockID],
									//~ myMiniLockID:myMiniLockID,
									//~ mySecretKey:miniLock.session.keys.secretKey,
									//~ message:{title:"hi",body:"my name is hello.. :P"}
								//~ }
								if (doc.id){
									//can only be read by the owner
									myMiniLockID=miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
									doc= {
										_id:doc.id,
										miniLockIDs:[myMiniLockID],
										myMiniLockID:myMiniLockID,
										mySecretKey:nacl.util.encodeBase64(miniLock.session.keys.secretKey),
										message:doc
									}
								}
								var header = {}
								header.decryptInfo={}
								var miniLockIDs=doc.miniLockIDs
								var myMiniLockID=doc.myMiniLockID
								var mySecretKey=nacl.util.decodeBase64(doc.mySecretKey)
								var message=nacl.util.decodeUTF8(
									JSON.stringify(doc.message)
								)
								
								var messageKeypair=nacl.box.keyPair()
								var messageKey=nacl.util.encodeBase64(messageKeypair.secretKey)
								var messageNonce=miniLock.crypto.getNonce()
								var messageHash=nacl.util.encodeBase64(
												nacl.hash(message)
											)
								header.ephemeral=nacl.util.encodeBase64(messageKeypair.publicKey)
								header.cipher=nacl.util.encodeBase64(nacl.secretbox(message, messageNonce, messageKeypair.secretKey))
								var decryptInfoNonces = []
								for (var u = 0; u < miniLockIDs.length; u++) {
									decryptInfoNonces.push(
										miniLock.crypto.getNonce()
									)
								}
								for (var i = 0; i < miniLockIDs.length; i++) {
									var decryptInfo = {
										senderID: myMiniLockID,
										recipientID: miniLockIDs[i],
										messageInfo: {
											messageKey: messageKey,
											messageNonce: nacl.util.encodeBase64(messageNonce),
											messageHash: messageHash
										}
									}
									
									console.log(
										nacl.util.decodeUTF8(JSON.stringify(decryptInfo.messageInfo)),
										decryptInfoNonces[i],
										Base58.decode(miniLockIDs[i]).subarray(0, 32),
										mySecretKey
									)
									decryptInfo.messageInfo = nacl.util.encodeBase64(nacl.box(
										nacl.util.decodeUTF8(JSON.stringify(decryptInfo.messageInfo)),
										decryptInfoNonces[i],
										Base58.decode(miniLockIDs[i]).subarray(0, 32),
										mySecretKey
									))
									console.log(decryptInfo)
									decryptInfo = nacl.util.encodeBase64(nacl.box(
										nacl.util.decodeUTF8(JSON.stringify(decryptInfo)),
										decryptInfoNonces[i],
										Base58.decode(miniLockIDs[i]).subarray(0, 32),
										messageKeypair.secretKey
									))
									
									header.decryptInfo[
										nacl.util.encodeBase64(decryptInfoNonces[i])
									] = decryptInfo
								}
								
								console.log(header)
								header._id=doc._id || PouchDB.utils.uuid()
							    return header;
							  }
							})
					    },
					    error: function(status) {
					        console.log(status);
					    }
					});
			    },
			    error: function(status) {
			        console.log(status);
			    }
			});
		}
	})				
}

miniLock.friendRequest=function(){}
miniLock.acceptFriend=function(){}
miniLock.post= function(cipher,decryptInfo,friends){}


miniLock.admin.fixAdmin = function (){
$.couch.session({
	success : function(r) {
		var userCtx = r.userCtx;
		if (userCtx.roles.indexOf("_admin") != -1) {
			adminWord=prompt("You are the admin of this node. Please input and remember a word for the admin account.") || "password"
			//Bootstrap node
			//Create two users. An admin account with using the adminWord
			// encrypted with user's public key to create a username and a password
			// and the user's regular account.
			// Create databases for accounts: credentials, requests , contact
			// credentials is admin writeable and this user readable
			// requests is public but doesnt allow updates if not admin
			// contact readable by anyone and contains the admin's public key
			$.couch.db("accountrequests").create({
			    success: function(data) {
			        console.log(data);
			    }
			});
			$.couch.db("mailtoid").create({
			    success: function(data) {
			        console.log(data);
			    }
			});
			
			$.couch.db("credentials").create({
			    success: function(data) {
			        console.log(data);
			        adminWord=nacl.util.decodeUTF8(adminWord)
					adminSeed=nacl.hash(adminWord)
					adminKeyPair=nacl.box.keyPair.fromSecretKey(adminSeed)
					adminNonce=miniLock.crypto.getNonce()
					
					
					credentials=miniLock.util.getRandomCredentials()
					cipherWord=nacl.box(nacl.util.decodeUTF8(credentials), adminNonce, miniLock.session.keys.publicKey, adminKeyPair.secretKey)
					
					cipherWord=nacl.util.encodeBase64(cipherWord)
					adminNonce=nacl.util.encodeBase64(adminNonce)
					console.log({"word":adminWord,"nonce": adminNonce,"pk": adminKeyPair.publicKey})
					
					adminName=credentials.substring(0,credentials.length/2)
					adminPassword=credentials.substring(credentials.length/2) 
					console.log({"adminName":adminName,"adminPass":adminPassword})
					
					myMiniLockID=miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
	
					var doc = {
						"_id":"admin",
						"miniLockID":miniLock.crypto.getMiniLockID(adminKeyPair.publicKey),
						"cipher":cipherWord,
						"nonce":adminNonce,
						"emergency":{"adminName":adminName,"adminPass":adminPassword}};
					$.couch.db("credentials").saveDoc(doc, {
					    success: function(data) {
					        console.log(data);
					    }
					});
					$.couch.config({
			            success : function(r) {
						  console.log(r)
						  setTimeout(function() {
						    miniLock.admin.login(
								miniLock.admin.bootstrapNode(
									adminName,
									miniLock.admin.createUser(
										myMiniLockID,
										miniLock.username
									)
								)
							)
						    
						  },200)
			            }
			          }, "admins", adminName, adminPassword);
			    },
			    error: function(status) {
			        console.log(status);
			    }
			});
			

		}
	}
});
}

miniLock.admin.createUser=function(data){
	miniLockID=data[0];
	username=data[1]
	callback=data[2]
	userPublicKey=Base58.decode(miniLockID).subarray(0, 32)

	$.couch.db("mailtoid").openDoc(username,{
		success:function (data){
			return {"error":"Username is taken"}
			},
		error:function(data){
			doc={"_id":username,"miniLockID":miniLockID}
			$.couch.db("mailtoid").saveDoc(doc,{
					success:function (data){
						console.log(data)
					}
				})
	        console.log(data);
	        credentials=miniLock.util.getRandomCredentials()				
			//~ nacl.sign.seedLength = adminSeed.byteLength
			$.couch.db("s-"+miniLockID.toLowerCase()).create({
			    success: function(data) {
			        console.log(data);
			    }
			});
			$.couch.db("p-"+miniLockID.toLowerCase()).create({
			    success: function(data) {
			        console.log(data);
			    }
			});
			nonce=miniLock.crypto.getNonce()
			cipherWord=nacl.box(nacl.util.decodeUTF8(credentials), nonce, userPublicKey, miniLock.admin.adminKeyPair.secretKey)
			cipherWord=nacl.util.encodeBase64(cipherWord)
			nonce=nacl.util.encodeBase64(nonce)
			var doc = {"_id":miniLockID,"cipher":cipherWord,"nonce":nonce};
			$.couch.db("credentials").saveDoc(doc, {
			    success: function(data) {
			        console.log(data);
			        couchName=credentials.substring(0,credentials.length/2)
					couchPassword=credentials.substring(credentials.length/2)
					miniLock.admin.secureDBandSignUp(couchName,couchPassword,miniLockID,callback);
			    },
			    error: function(status) {
			        console.log(status);
			    }
			});
				   
			
		}
	})
}	
		


miniLock.admin.login=function(callback){
			
	adminMiniLockID=miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
	
	adminSeed=miniLock.admin.seed
	miniLock.admin.adminKeyPair=nacl.box.keyPair.fromSecretKey(adminSeed)
	$.couch.db("credentials").openDoc("admin", {
	    success: function(data) {
			
			cipher=nacl.util.decodeBase64(data.cipher)
			nonce=nacl.util.decodeBase64(data.nonce)
	        console.log(data);
	        credentials=nacl.box.open(cipher, nonce, miniLock.session.keys.publicKey, miniLock.admin.adminKeyPair.secretKey)
			credentials=nacl.util.encodeUTF8(credentials)
			console.log(credentials)
			adminName=credentials.substring(0,credentials.length/2)
			adminPassword=credentials.substring(credentials.length/2)
			$.couch.login({
			    name: adminName,
			    password: adminPassword,
			    success: function(data) {
			        console.log(data);
			        callback.func(callback.data)
			        
			    },
			    error: function(status) {
			        console.log(status);
			    }
			});
			
			
	    },
	    error: function(status) {
	        console.log(status);
	    }
	});				
	
}	

miniLock.admin.logout=function (data){
	$.couch.logout({
	    success: function(data) {
	        console.log(data);
	        miniLock.login()
	    }
	});
	
}	
	
miniLock.admin.bootstrapNode=function(data){
	adminUser=data[0]
	callback=data[1]
	//create requests db and credential db 
	no_update= {	
			   "_id": "_design/no_update",
			   "language": "javascript",
			   "validate_doc_update": "function(newDoc, oldDoc, userCtx) {   if(oldDoc && userCtx.roles.indexOf('_admin')==-1){throw({forbidden : 'you are not allowed !' });}}"
			}
	security= {	
				"_id":"_security",
			    "admins" : {
			        "names" : [],
			        "roles" : []
			    },
			    "readers" : {
			        "names" : [],
			        "roles" : []
				}
			  }
	$.couch.db("accountrequests").saveDoc(no_update, {
	    success: function(data) {
	        console.log(data);
	        security.admins.names.push(adminUser)
			$.couch.db("mailtoid").saveDoc(security, {
			    success: function(data) {
			        console.log(data);
			        callback.func(callback.data)
			     }
			})
		}
	})		  
	

}
//~ public db no update validate function
miniLock.admin.secureDBandSignUp=function(couchUser,couchPassword,miniLockID,callback){
	var userDoc = {
				    _id: "org.couchdb.user:"+couchUser,
				    name: couchUser
				};
	var no_update= {	
				   "_id": "_design/no_update",
				   "language": "javascript",
				   "validate_doc_update": "function(newDoc, oldDoc, userCtx) {   if(oldDoc && userCtx.roles.indexOf('_admin')==-1){throw({forbidden : 'you are not allowed !' });}}"
				}
	
	
	
	var securityp= {	
				"_id":"_security",
			    "admins" : {
			        "names" : [couchUser],
			        "roles" : []
			    },
			    "readers" : {
			        "names" : [],
			        "roles" : []
				}
			  }
	var securitys= {	
				"_id":"_security",
			    "admins" : {
			        "names" : [couchUser],
			        "roles" : []
			    },
			    "readers" : {
			        "names" : [couchUser],
			        "roles" : []
				}
			  }
	
	$.couch.db("p-"+miniLockID.toLowerCase()).saveDoc(no_update, {
	    success: function(data) {
	        console.log(data);
	        $.couch.db("p-"+miniLockID.toLowerCase()).saveDoc(securityp, {
			    success: function(data) {
			        console.log(data);
					$.couch.db("s-"+miniLockID.toLowerCase()).saveDoc(securitys, {
					    success: function(data) {
					        console.log(data);
					        $.couch.signup(userDoc, couchPassword, {
							    success: function(data) {
							        console.log(data);
									callback.func(callback.data)
							    },
							    error: function(status) {
							        console.log(status);
							    }
							});
   				        }
					})
				}
			})
		}
	})
	
	
}



function test(){
	adminWord="password"
	adminWord=nacl.util.decodeUTF8(adminWord)
	adminSeed=nacl.hash(adminWord)
	adminKeyPair=nacl.box.keyPair.fromSecretKey(adminSeed)
	adminNonce=miniLock.crypto.getNonce()
	
	
	credentials=miniLock.util.getRandomCredentials()
	cipherWord=nacl.box(nacl.util.decodeUTF8(credentials), adminNonce, miniLock.session.keys.publicKey, adminKeyPair.secretKey)
	
	cipherWord=nacl.util.encodeBase64(cipherWord)
	adminNonce=nacl.util.encodeBase64(adminNonce)
	
	adminName=credentials.substring(0,credentials.length/2)
	adminPassword=credentials.substring(credentials.length/2) 
	console.log({"word":adminWord,"nonce": adminNonce,"pk": adminKeyPair.publicKey})
	
	console.log({"adminName":adminName,"adminPass":adminPassword})
	
	nonce=adminNonce
	myMiniLockID=miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)  
	cipher=nacl.util.decodeBase64(cipherWord)
	nonce=nacl.util.decodeBase64(nonce)
	console.log({"nonce": nonce,"cipher": cipher})

	credentials=nacl.box.open(cipher, nonce,  adminKeyPair.publicKey,miniLock.session.keys.secretKey)
	credentials=nacl.util.encodeUTF8(credentials)
	console.log(credentials)
	adminName=credentials.substring(0,credentials.length/2)
	adminPassword=credentials.substring(credentials.length/2)
	console.log({"adminName":adminName,"adminPass":adminPassword})

	}
