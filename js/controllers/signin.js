

'use strict';

/* Controllers */
  // signin controller
app.controller('SigninFormController', ['$scope',  '$state', function($scope, $state) {
    $scope.user = {name:"vasilis",domain:"https://peerbay.couchappy.com",password:"9411662"};
    
    $scope.authError = null;
    $scope.admin = false;
    $scope.login = function() {
		miniLock.crypto.getKeyPair($scope.user.password,$scope.user.name+"@"+$scope.user.domain, function(keyPair) {
			miniLock.session.keys = keyPair
			miniLock.session.keyPairReady = true
			miniLock.domain=$scope.user.domain
			// Keep polling until we have a key pair
			var keyReadyInterval = setInterval(function() {
				if (miniLock.session.keyPairReady) {
					clearInterval(keyReadyInterval)
					var myMiniLockID = miniLock.crypto.getMiniLockID(miniLock.session.keys.publicKey)
					var simpleID=myMiniLockID.toLowerCase()
					console.log(simpleID)
					$.couch.urlPrefix = $scope.user.domain;
					
					$.couch.db("p-"+simpleID).info({
					    success: function(data) {
					        console.log(data);
							miniLock.login()
							$state.go('app.page.profile');
					    },
					    error: function(data){
							console.log(data)
							$scope.authError = 'Email or Password not right';
						}
					});
				}
			},200)
	      })
	  }
}]);
	      
      
      
      
      
      
      
      
      
      
      
      
      
