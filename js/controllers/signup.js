'use strict';

// signup controller
app.controller('SignupFormController', ['$scope', '$state', function($scope,  $state) {
    $scope.user = {};
    $scope.authError = null;
    $scope.admin = false;
    $scope.user.adminPassword=null
    $scope.signup = function() {
      // Try to create
        miniLock.domain=$scope.user.domain
	    miniLock.crypto.getKeyPair($scope.user.password,$scope.user.name+"@"+$scope.user.domain, function(keyPair) {
			miniLock.session.keys = keyPair
			miniLock.session.keyPairReady = true
			// Keep polling until we have a key pair
			var keyReadyInterval = setInterval(function() {
				if (miniLock.session.keyPairReady) {
					clearInterval(keyReadyInterval)
					var myMiniLockID = miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
					var simpleID=myMiniLockID.toLowerCase()
					console.log(simpleID)
					$.couch.urlPrefix = $scope.user.domain;

					$.couch.session({
						success : function(r) {
							console.log(r)
							var userCtx = r.userCtx;
							if (userCtx.roles.indexOf("_admin") != -1) {
							    if ($scope.user.adminPassword==null){
									$scope.admin = true;
								    $scope.authError = "Admin party.Insert admin password.";
								    $scope.$apply();
								    
							    }else{
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
									        var adminWord=nacl.util.decodeUTF8($scope.user.adminPassword)
											miniLock.admin.seed=nacl.hash(adminWord)
											var adminKeyPair=nacl.box.keyPair.fromSecretKey(miniLock.admin.seed)
											var adminNonce=miniLock.crypto.getNonce()
											
											
											var credentials=miniLock.util.getRandomCredentials()
											var cipherWord=nacl.box(nacl.util.decodeUTF8(credentials), adminNonce, miniLock.session.keys.publicKey, adminKeyPair.secretKey)
											
											cipherWord=nacl.util.encodeBase64(cipherWord)
											adminNonce=nacl.util.encodeBase64(adminNonce)
											console.log({"word":adminWord,"nonce": adminNonce,"pk": adminKeyPair.publicKey})
											
											var adminName=credentials.substring(0,credentials.length/2)
											var adminPassword=credentials.substring(credentials.length/2) 
											console.log({"adminName":adminName,"adminPass":adminPassword})
											
											var myMiniLockID=miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
							
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
														{"func":miniLock.admin.bootstrapNode,
														 "data":[adminName,
															{"func":miniLock.admin.createUser,
															 "data":[myMiniLockID,$scope.user.name,
																{"func":miniLock.admin.logout,"data":[]}
																]
															 }
															]
														}	 
													);
													$state.go('app.page.profile');
												    
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
						}
					})			
					//~ $scope.miniLock.admin.fixAdmin()
				}
			},100)
	      })
	      
      
      
      
    };
  }])
 ;
