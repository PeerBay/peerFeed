

'use strict';

/* Controllers */
  // profile wizard controller
app.controller('ProfileWizard', ['$scope',  '$state', 'FileUploader', function($scope, $state, FileUploader) {
    $scope.profile = {};
	$scope.profile.id="profile"
   $scope.createProfileDoc=function(){
	   console.log($scope.profile)
	   miniLock.session.secretDB.put($scope.profile).then(function(r) {
		   console.log(r)
		   $state.go('app.page.profile');
		   })
	}
	   
    var uploader = $scope.uploader = new FileUploader();
    uploader.onAfterAddingFile = function(fileItem) {
      var reader = new FileReader();
      reader.onload = function (evt) {
    	  $scope.profile.image=evt.target.result;
      };
      reader.readAsDataURL(fileItem._file);
    };   
    //~ miniLock.session.secretDB.get("profile" ,function(err, doc) { 
		//~ if(err){
			//~ $state.go('app.form.profileWizard');
			//~ 
		//~ }else{
			//~ miniLock.session.profile=doc
			//~ $scope.user=doc
			//~ $scope.$apply()
		//~ }
	//~ })
}])		
    
