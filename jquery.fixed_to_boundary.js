(function($) {
    /**
     * Limit the scroll top and bottom of a fixed element to the content area
     */
    $.fn.cwFixedToBoundary = function ( options ) {
        var settings = $.extend({
            boundary: '.section',
            window: $(window),
            document: $(document)
        }, options);

        return this.each(function() {
            var element = $(this);
            var boundary = $( element.parents( settings.boundary )[0]);

            // Base propertyMan(ager) definition
            var propertyMan = {
                operationCount: 0, // Intended for developers, this is used to count the 'operations' made to the element. Keep as low as possible.
                scrollingDown: false,
                scrollingUp: false,
                currentScrollingDirection: '',
                previousScrollingDirection: '',
                prevScrollTop: 0,
                scrollTop: 0,
                scrollBottom: settings.window.height(),

                element: {
                    doesFitInBrowser: (settings.window.height() >= element.outerHeight(true)) ? true : false,
                    isFixed: false,
                    isAbsolute: false,
                    startOffset: element.offset(),
                    startPosition: element.position(),
                    offset: {},
                    position: {},
                    offsetBottom: 0,
                    marginTop: parseInt(element.css('margin-top')),
                    marginBottom: parseInt(element.css('margin-bottom'))
                },

                boundary: {
                    startOffset: boundary.offset(),
                    startPosition: boundary.position(),
                    offset: {},
                    position: {},
                    offsetBottom: 0
                }
            };

            // Overwrites (and returns) propertyMan (used in the onScroll event)
            var updatePropertyMan = function() {
                var scrollTop = settings.window.scrollTop();
                var elementOffset = element.offset();
                var elementPosition = element.position();
                var elementOuterHeight = element.outerHeight(true);
                var elementMarginTop = parseInt(element.css('margin-top'));
                var elementMarginBottom = parseInt(element.css('margin-bottom'));
                var boundaryOffset = boundary.offset();
                var boundaryPosition = boundary.position();
                var boundaryHeight = boundary.height();
                var windowHeight =  settings.window.height();

                var oldPropertyMan = propertyMan;
                $.extend(true, propertyMan, {
                    operationCount: oldPropertyMan.operationCount,
                    scrollTop: scrollTop,
                    scrollBottom: scrollTop + windowHeight,
                    prevScrollTop: oldPropertyMan.scrollTop,
                    scrollingDown: (scrollTop >= (oldPropertyMan.scrollTop)) ? true : false,
                    scrollingUp: (scrollTop < (oldPropertyMan.scrollTop)) ? true : false,
                    currentScrollingDirection: (scrollTop < (oldPropertyMan.scrollTop)) ? 'up' : 'down',
                    previousScrollingDirection: (oldPropertyMan.scrollingUp) ? 'up' : 'down',

                    element: {
                        doesFitInBrowser: (windowHeight >= elementOuterHeight) ? true : false,
                        isFixed: (element.css('position') == 'fixed') ? true : false,
                        isAbsolute: (element.css('position') == 'absolute') ? true : false,
                        offset: elementOffset,
                        position: elementPosition,
                        offsetBottom: elementOffset.top + (elementOuterHeight - elementMarginTop),
                        marginTop: elementMarginTop,
                        marginBottom: elementMarginBottom
                    },

                    boundary: {
                        offset: boundaryOffset,
                        position: boundaryPosition,
                        offsetBottom: boundaryOffset.top + boundaryHeight
                    }

                });

                return propertyMan;
            };

            settings.window.scroll(function(e){
                var pm = updatePropertyMan(); // We are using 'pm' as a shortcut
                //console.log(JSON.stringify(pm), pm);

                // If this is a new change of direction, lock the element in place
                if (pm.currentScrollingDirection != pm.previousScrollingDirection) {
                    var tmpTop = 'auto';
                    var tmpBottom = 'auto';

                    if (pm.element.offsetBottom >= pm.boundary.offsetBottom) {
                        tmpBottom = 0;
                    } else if (pm.element.offset.top <= pm.element.startOffset.top) {
                        tmpTop = pm.element.startPosition.top;
                    } else {
                        tmpTop = (pm.element.offset.top - pm.boundary.offset.top - pm.element.marginTop);
                    }

                    element.css({
                        position: 'absolute',
                        top: tmpTop,
                        bottom: tmpBottom
                    });
                    pm.isAbsolute = false; pm.isFixed = false;
                }

                // If scrolling down...
                if (pm.scrollingDown) {

                    // If the bottom of the viewport goes beyond the bottom of the element *or* if the element fits in the
                    // browser viewport *and* the top of the viewport goes beyond the top of the element
                    if (pm.scrollBottom >= pm.element.offsetBottom || (pm.element.doesFitInBrowser && pm.scrollTop >= (pm.element.offset.top - pm.element.marginTop))) {

                        // If the element fits in the browser window we lock it to the top of the viewport not the bottom
                        if (pm.element.doesFitInBrowser) {

                            if (pm.element.offset.top >= pm.element.startOffset.top && pm.scrollTop >= (pm.element.offset.top - pm.element.marginTop) ) {
                                // If the top of the element is within the boundary, scroll it with the viewport (fixed to top)
                                if (!pm.isFixed) {
                                    pm.isFixed = true; pm.isAbsolute = false;

                                    element.css({
                                        position: 'fixed',
                                        bottom: 'auto',
                                        top: 0
                                    });

                                    pm.operationCount++;
                                }
                            }

                        } else {

                            if (pm.element.offsetBottom <= pm.boundary.offsetBottom) {
                                // If the bottom of the element is within the boundary, scroll it with the viewport (fixed to bottom)
                                if (!pm.isFixed) {
                                    pm.isFixed = true; pm.isAbsolute = false;

                                    element.css({
                                        position: 'fixed',
                                        top: 'auto',
                                        bottom: 0
                                    });
                                    pm.operationCount++;
                                }
                            }

                        }

                        // If the bottom of the element goes beyond the bottom of the boundary, lock it's position
                        if (pm.element.offsetBottom >= pm.boundary.offsetBottom) {

                            if (!pm.isAbsolute) {
                                pm.isAbsolute = true; pm.isFixed = false;

                                element.css({
                                    position: 'absolute',
                                    top: 'auto',
                                    bottom: 0
                                });
                                pm.operationCount++;
                            }
                        }
                    }

                } else if (pm.scrollingUp) {
                    // Scrolling Up...

                    // If the top of the viewport goes beyond the top of the element...
                    if (pm.scrollTop <= (pm.element.offset.top - pm.element.marginTop)) {

                        // If the top of the element goes beyond the top of the boundary, lock it's position
                        if (pm.element.offset.top <= pm.element.startOffset.top) {

                            if (!pm.isAbsolute) {
                                pm.isAbsolute = true; pm.isFixed = false;

                                element.css({
                                    position: 'absolute',
                                    bottom: 'auto',
                                    top: pm.element.startPosition.top
                                });

                                pm.operationCount++;
                            }

                        } else {
                            // If top of element is within the boundary, scroll with viewport

                            if (!pm.isFixed) {
                                pm.isFixed = true; pm.isAbsolute = false;

                                element.css({
                                    position: 'fixed',
                                    bottom: 'auto',
                                    top: 0
                                });

                                pm.operationCount++;
                            }

                        }
                    }
                }

                propertyMan = pm;
            });
        });

    };
})(jQuery);
