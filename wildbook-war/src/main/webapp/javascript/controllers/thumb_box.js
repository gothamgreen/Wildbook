wildbook.app.directive(
    'wbThumbBox',
    ["wbDateUtils", "keyEvents", "wbLangUtils", function(wbDateUtils, keyEvents, wbLangUtils) {
        function getKeySetup(priority) {
            return function(scope, element) {
                return keyEvents.handler(priority ? parseInt(priority) : 100)
                .keydown(
                    function handleKeyDown(event) {
                        //
                        // Ignore any keystrokes here that are coming from an input box.
                        //
                        if (event.is.input) {
                            return;
                        }
                        
                        if (event.is.leftarrow) {
                            scope.$applyAsync(scope.panLeft);
                            return false;
                        }
                        if ( event.is.rightarrow ) {
                            scope.$applyAsync(scope.panRight);
                            return false;
                        }
                        scope.$applyAsync(scope.performKeyCode(event.which));
                    }
                );
            };
        }
        
        return {
            restrict: 'E',
            scope: {
                photos: "=",
                actions: "=",
                cbAction: "&",
                blockSize: "@",
                defaultBlockCount: "@"
            },
            link: function(scope, element, attrs) {
                KeyEventHandler.link(getKeySetup(attrs.wbKeyHandlerPriority), scope, element, attrs);
            },
            templateUrl: 'util/render?j=partials/wb_thumb_box',
            replace: true,
            controller: function($scope) {
                var startIdx = 0;
                var idx;
                
                $scope.slider = {value: 18, step: 9};
                if ($scope.blockSize) {
                    $scope.slider.step = parseInt($scope.blockSize);
                }
                if ($scope.defaultBlockCount) {
                    $scope.slider.value = parseInt($scope.defaultBlockCount) * $scope.slider.step;
                }

                $scope.sliderMax = function() {
                    return Math.ceil($scope.photos.length / $scope.slider.step) * $scope.slider.step;
                }
                
                $scope.getTimestamp = function(photo) {
                    return wbDateUtils.dateStringFromRest(photo.timestamp);
                }
                
                function pageLeft() {
                    startIdx = startIdx - $scope.slider.value;
                    if (startIdx < 0) {
                        startIdx = 0;
                    }
                }
                
                $scope.panLeft = function() {
                    if (! $scope.photos) {
                        return;
                    }
                    if ($scope.zoomimage) {
                        if (idx <= 0) {
                            return;
                        }
                        idx--;
                        $scope.zoomimage = $scope.photos[idx];
                        
                        //
                        // If we have panned far enough such that we are now on the next
                        // "page" of thumbnails, let's reflect that.
                        //
                        if (idx < startIdx) {
                            pageLeft();
                        }
                    } else {
                        pageLeft();
                    }
                }

                function pageRight() {
                    startIdx = startIdx + $scope.slider.value;
                    if (startIdx + $scope.slider.value > $scope.photos.length) {
                        startIdx = $scope.photos.length - $scope.slider.value;
                        if (startIdx < 0) {
                            startIdx = 0;
                        }
                    }
                }
                
                $scope.panRight = function() {
                    if (! $scope.photos) {
                        return;
                    }
                    if ($scope.zoomimage) {
                        if (idx >= $scope.photos.length - 1) {
                            return;
                        }
                        idx++;
                        $scope.zoomimage = $scope.photos[idx];
                        
                        //
                        // If we have panned far enough such that we are now on the next
                        // "page" of thumbnails, let's reflect that.
                        //
                        if (idx >= startIdx + $scope.slider.value) {
                            pageRight();
                        }
                    } else {
                        pageRight();
                    }
                }
                
                function doAction(action, images) {
                    var result = $scope.cbAction({code: action.code, photos: images});
                    if (result && result.then) {
                        result.then(function() {
                            $scope.$applyAsync(postPerformAction(action, images));
                        });
                    } else {
                        $scope.$applyAsync(postPerformAction(action, images));
                    }
                }
                
                function postPerformAction(action, images) {
                    switch (action.code) {
                    case "del": {
                        $scope.photos = wbLangUtils.filterByArrayProp($scope.photos, images, function(targetItem, filterItem) {
                            return (targetItem.id === filterItem.id);
                        });
                        
                        if ($scope.photos.length === 0) {
                            $scope.zoomimage = null;
                        }
                        
                        //
                        // Check that our idx is still in range, if not
                        // set it to the last image.
                        //
                        if (idx > $scope.photos.length - 1) {
                            idx = $scope.photos.length - 1;
                        }
                        $scope.zoomimage = $scope.photos[idx];
                    }}
                }
                
                $scope.performAction = function(action) {
                    var images;
                    if ($scope.zoomimage) {
                        images = [$scope.zoomimage];
                    } else {
                        //TODO: Once we allow multiple selection of thumbs then
                        // we can send selected images to be acted upon
                        //images = $scope.selected;
                    }
                    
                    if (action.confirm) {
                        return alertplus.confirm(action.confirm.message, action.tooltip, true)
                        .then(function() {
                            doAction(action, images);
                        });
                    } else {
                        doAction(action, images);
                    }
                }
                
                $scope.performKeyCode = function(keyCode) {
                    //
                    // Look for an action with this keyCode
                    //
                    if (!$scope.actions) {
                        return;
                    }
                    var action = wbLangUtils.findInArray($scope.actions, function(item) {
                        return (item.shortcutKeyCode === keyCode);
                    });
                    
                    if (action) {
                        performAction(action);
                    }
                }
                    
                $scope.isLeftDisabled = function() {
                    if ($scope.zoomimage) {
                        return (idx <= 0);
                    }
                    return (startIdx <= 0);
                }
                
                $scope.isRightDisabled = function() {
                    if ($scope.zoomimage) {
                        return (idx >= $scope.photos.length - 1);
                    }
                    
                    if (! $scope.photos) {
                        return true;
                    }
                    return (startIdx >= $scope.photos.length - $scope.slider.value);
                }
                
                $scope.viewImage = function(photo) {
                    $scope.zoomimage = photo;
                    
                    if (!photo) {
                        return;
                    }
                    
                    idx = wbLangUtils.findIndexInArray($scope.photos, function(item) {
                        return (item.id === photo.id);
                    });
                }
                
                $scope.getVisPhotos = function() {
                    if (! $scope.photos) {
                        return [];
                    }
                    return $scope.photos.slice(startIdx, startIdx + $scope.slider.value);
                }
                
                //
                // wb-key-handler-form
                //
                $scope.cancel = function() {
                    $scope.zoomimage = null;
                }
                
                $scope.cmdEnter = function() {
                    // do nothing
                    // want this here to override any parent scope cmdEnter event though.
                }
            }
        };
    }]
);
