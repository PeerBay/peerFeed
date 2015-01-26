

'use strict';

/* Controllers */
  // signin controller
app.controller('ProfileController', ['$scope',  '$state', function($scope, $state) {
    $scope.user = {};
    $scope.authError = null;
    miniLock.session.secretDB.get
