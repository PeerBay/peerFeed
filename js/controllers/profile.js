

'use strict';

/* Controllers */
  // signin controller
app.controller('ProfileController', ['$scope',  '$state', function($scope, $state) {
    $scope.user = {};
    $scope.authError = null;
    miniLock.session.secretDB.get("profile" ,function(err, doc) { 
		if(err){
			console.log("error",err)
			$state.go('app.form.profileWizard');
			
		}else{
			miniLock.session.profile=doc
			$scope.user=doc
			$scope.$apply()
		}
	})
	//~ $scope.
}])		
    
