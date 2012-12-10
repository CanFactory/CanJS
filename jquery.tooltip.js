/*
 * $.html5data v1.0
 * Copyright 2011, Mark Dalgleish
 *
 * This content is released under the MIT License
 * github.com/markdalgleish/jquery-html5data/blob/master/MIT-LICENSE.txt
 */

(function($, undefined) {
    $.fn.html5data = function(namespace, options) {
        var defaults = {
            //Customise the parsing options
            parseBooleans: true,
            parseNumbers: true,
            parseNulls: true,
            parseJSON: true,

            //Custom parse function
            parse: undefined
        },

            settings = $.extend({}, defaults, options),

            objects = [],

            //The data attribute prefix. 'data-' if global, 'data-foo-' if namespaced
            prefix = 'data-' + (namespace ? namespace + '-' : ''),

            //Runs every time a value is retrieved from the DOM
            parseValue = function(val) {
                var valLower = val.toLowerCase(),
                    firstChar = val.charAt(0);

                if (settings.parseBooleans === true && valLower === 'true') {
                    return true;
                } else if (settings.parseBooleans === true && valLower === 'false') {
                    return false;
                } else if (settings.parseNulls === true && valLower === 'null') {
                    return null;
                } else if (settings.parseNumbers === true && !isNaN(val * 1)) {
                    return val * 1;
                } else if (settings.parseJSON === true && firstChar === '[' || firstChar === '{') {
                    return $.parseJSON(val);
                } else if (typeof settings.parse === 'function') {
                    return settings.parse(val);
                } else {
                    return val;
                }
            };

        this.each(function() {
            var obj = {},
                attr,
                nameArray,
                name;

            for (var i = 0, iLen = this.attributes.length; i < iLen; i ++) {
                attr = this.attributes[i];

                if (attr.name.indexOf(prefix) === 0) {
                    name = '';
                    nameArray = attr.name.replace(prefix, '').split('-');

                    for (var j = 0, jLen = nameArray.length; j < jLen; j++) {
                        name += (j === 0 ? nameArray[j].toLowerCase() : nameArray[j].charAt(0).toUpperCase() + nameArray[j].slice(1).toLowerCase());
                    }

                    obj[name] = parseValue(attr.value);
                }
            }

            objects.push(obj);
        });

        //If .html5data is called on a single element, return a single object
        //Otherwise return an array of objects
        if (objects.length === 1) {
            return objects[0];
        } else {
            return objects;
        }
    };

    $.html5data = function(elem, namespace, options) {
        return $(elem).html5data(namespace, options);
    };
})(jQuery);

/*
 * END
 */






(function($) {
    /**
     * Upgrades an element to a stylised tooltip
     *
     * @param boundary      This selector is matched against parent elements, the tooltip will stay within it's borders
     * @param idleTimeout      Timeout before showing tooltip
     * @param idleInteractiveClose      Timeout before hiding an interactive tooltip
     * @param allowMultiple      Show multiple tooltips at once?
     */
    function TooltipClass(node, options)  {

        // Public Properties & Settings
        this.settings = $.extend({
            boundary: 'window',
            idleTimeout: 150,
            idleInteractiveClose: 750,
            allowMultiple: false
        }, options);


        // Private Properties
        var body = $('body');
        var boundary = (this.settings.boundary == 'window') ? $(window) : $(this.settings.boundary);
        var element = $(node);
        var status = $('<div />').attr('id', $.cwUniqueId('aria-status')).attr('role', 'status').attr('aria-live', 'polite').addClass('aria-status');
        var dataSource = {};
        var tooltip;
        var template;
        var hasTemplate = false;
        var hasSiblingTemplate = false;
        var templateSuffix;
        var nextElement;
        var targetTop;
        var targetLeft;
        var timer;
        var closeTimer;

        var templateHas = {
            title: false,
            description: false
        };

        var positionSettings = {
            sourcePos: {top: 0, left: 0},
            containerPos: {top: 0, left: 0, bottom: 0, right: 0},
            srcWidth: 0,
            srcHeight: 0,
            tooltipWidth: 0,
            tooltipHeight: 0,
            hasBeenShuffled: false,
            hasPosition: {
                top: true,
                middle: false,
                bottom: false,
                left: false,
                center: true,
                right: false
            },
            wantsPosition: {
                top: false,
                middle: false,
                bottom: false,
                left: false,
                center: false,
                right: false
            },
            rawPosition: 'top center'
        };

        // Aliases (shorthand for developers)
        var ps = positionSettings;

        // Private TooltipCreation function
        var create = function() {

            // If tooltip has already been created, show it and stop execution
            if (element.is('.tooltip-exists')) {
                that.show();
                return true;
            } else {
                element.addClass('tooltip-exists');
            }

            // Detect Template
            if ( that.settings.template && that.settings.template.length ) {
                templateSuffix = that.settings.template;
            }
            if (templateSuffix) {
                // A template ID was provided so we use that...
                template = $('#tooltip-template-' + templateSuffix);
                if (template.length) {
                    element.addClass(templateSuffix);
                    hasTemplate = true;
                }

            } else {
                nextElement = element.next();
                if (nextElement.is(".tooltip-box")) {
                    // An immediate sibling template was found so we use that...
                    template = nextElement;
                    hasTemplate = true;
                    hasSiblingTemplate = true;
                } else {
                    // No template was found so we use the default...
                    template = $('#tooltip-template');
                    hasTemplate = false;
                }
            }

            // Clone and move tooltip HTML into place after the source element
            var id;
            if (typeof $.cwUniqueId == 'function') {
                id = $.cwUniqueId('tooltip');
            } else {
                id = Math.floor(Math.random() * new Date().getTime());
            }
            tooltip = template.clone(true).appendTo(body).attr('id', id);
            if (hasSiblingTemplate) {
                template.remove();
            }

            // Add some default attributes to the new tooltip
            if (!tooltip.data('tooltip-mouseover')) {
                tooltip.data('tooltip-mouseover', false);
            }
            if (!tooltip.data('tooltip-interactive')) {
                tooltip.data('tooltip-interactive', false);
            }
            if (!tooltip.data('tooltip-persist')) {
                tooltip.data('tooltip-persist', false);
            }


            // Populate dataSource from sourceElement
            if (typeof $.fn.html5data == 'function') {
                dataSource = element.html5data('field');
            }

            // Populate template regions with data from dataSource
            if (hasTemplate) {
                tooltip.find('[data-field]').each(function(index, field) {
                    field = $(field);
                    var content = dataSource[field.data('field')];

                    if (field && content != '') {
                        field.text(dataSource[field.data('field')]);
                    } else if (!field.hasClass('default')) {
                        // If the field has a class of `default` show it, otherwise hide the field
                        field.hide();
                    }
                });

            } else {

                // Build contents of basic template if it's unspecified
                if ( dataSource.title && dataSource.title != '' ) {
                    templateHas.title = true;
                }
                if ( dataSource.description && dataSource.description != '' ) {
                    templateHas.description = true;
                }

                if (templateHas.title && templateHas.description) {
                    tooltip.append($('<h3 />').text( dataSource.title ));
                    tooltip.append($('<hr />'));
                    tooltip.append($('<span />').text( dataSource.description ));

                } else {
                    if (templateHas.title) {
                        tooltip.append($('<span />').text(dataSource.title));
                    } else if (templateHas.description) {
                        tooltip.append($('<span />').text(dataSource.description));
                    } else {
                        element.removeClass('tooltip-exists');
                        tooltip = null;
                        return false;
                    }
                }
            }

            // If the tooltip contains interactive elements add a data attribute
            if (tooltip.find('a, button, form, input').length) {
                tooltip.data('tooltip-interactive', true);
            }

            // If the tooltip is persistent we need to add a close button
            if (element.is('.persist')) {
                tooltip.prepend($('<a />').attr('href', '#').addClass('close').text('close'));
                tooltip.on('click', 'a.close', function(event) {
                    event.preventDefault();
                    that.hide();
                    return false;
                });
            }

            // If the tooltip contains interactive elements or is persistent
            // add a data attribute so we can slow down the timeout
            // and add a hover event
            if (tooltip.data('tooltip-interactive') && !element.is('.persist')) {

                // Bind to mouse enter/leave
                tooltip.mouseenter(function() {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    if (closeTimer) {
                        clearTimeout(closeTimer);
                    }
                });

                tooltip.mouseleave(function() {
                    closeTimer = setTimeout(function() {
                        close();
                    }, that.settings.idleInteractiveClose);
                });
            }

            // Add any specified classes to the tooltip
            if (that.settings.classes && that.settings.classes.length) {
                tooltip.addClass( that.settings.classes );
            }

            addAccessibility();
            that.show();
        };

        // This positions the tooltip, it is complex and fragile - Be careful.
        var positionTooltip = function() {

            // Render tooltip (invisibly) to get an accurate height
            tooltip.css({display: 'block', visibility: 'hidden', position: 'absolute'});

            ps.hasBeenShuffled = false;
            ps.sourcePos = element.offset();

            if (boundary.offset()) {
                ps.containerPos = boundary.offset();
            } else {
                ps.containerPos.top = boundary.scrollTop();
                ps.containerPos.left = boundary.scrollLeft();
            }
            ps.containerPos.right = boundary.width() + ps.containerPos.left;
            ps.containerPos.bottom = boundary.height() + ps.containerPos.top;

            // Setup Variables
            ps.srcWidth = element.outerWidth();
            ps.srcHeight = element.outerHeight();
            ps.tooltipWidth = tooltip.outerWidth(true);
            ps.tooltipHeight = tooltip.outerHeight(true);

            if (that.settings.position && that.settings.position.length) {
                ps.rawPosition = that.settings.position;
            }

            for (position in ps.wantsPosition) {
                if (ps.rawPosition.indexOf(position) > -1) {
                    ps.wantsPosition[position] = true;
                }
            }

            // Default (Top Center)
            targetTop = ps.sourcePos.top - ps.tooltipHeight;
            targetLeft = ps.sourcePos.left + ((ps.srcWidth / 2) - (ps.tooltipWidth / 2));
            ps.hasPosition.top = true;
            ps.hasPosition.middle = false;
            ps.hasPosition.bottom = false;
            ps.hasPosition.left = false;
            ps.hasPosition.center = true;
            ps.hasPosition.right = false;


            // Bottom
            if ( (ps.wantsPosition.bottom || (ps.containerPos.top > targetTop)) && ps.wantsPosition.center )  {
                ps.hasPosition.top = false;
                ps.hasPosition.middle = false;
                ps.hasPosition.bottom = true;
                targetTop = ps.sourcePos.top + ps.srcHeight;
            }

            // Left
            if (ps.wantsPosition.left) {
                ps.hasPosition.center = false;
                ps.hasPosition.right = false;
                ps.hasPosition.left = true;

                if (ps.hasPosition.top) {
                    targetTop += ps.srcHeight;
                } else {
                    targetTop -= ps.srcHeight;
                }

                targetLeft = ps.sourcePos.left - ps.tooltipWidth;
            }

            // Right
            if (ps.wantsPosition.right) {
                ps.hasPosition.center = false;
                ps.hasPosition.left = false;
                ps.hasPosition.right = true;

                if (ps.hasPosition.top) {
                    targetTop += ps.srcHeight;
                } else {
                    targetTop -= ps.srcHeight;
                }
                targetLeft = ps.sourcePos.left + ps.srcWidth;
            }

            // Middle
            if (ps.wantsPosition.middle) {
                ps.hasPosition.middle = true;
                ps.hasPosition.top = false;
                ps.hasPosition.bottom = false;
                targetTop = (ps.sourcePos.top + ps.srcHeight / 2) - (ps.tooltipHeight / 2);
            }


            // Left Boundary Check
            if (ps.containerPos.left > targetLeft) {
                // We need to shuffle to the right
                targetLeft += (ps.containerPos.left - targetLeft);
                ps.hasBeenShuffled = true;
            }

            // Right Boundary Check
            if ((targetLeft + ps.tooltipWidth) > ps.containerPos.right) {
                // We need to shuffle to the left
                targetLeft -= (targetLeft + ps.tooltipWidth) - ps.containerPos.right;
                ps.hasBeenShuffled = true;
            }


            if (ps.hasBeenShuffled) {
                // If we've had to shuffle the popup due to the container's width constraints
                // ensure we don't cover the element by defaulting back to Top or Bottom
                if (ps.hasPosition.top || ps.hasPosition.middle) {
                    targetTop = ps.sourcePos.top - ps.tooltipHeight;
                    ps.hasPosition.top = true;
                    ps.hasPosition.middle = false;
                    ps.hasPosition.bottom = false;
                }

                if (ps.hasPosition.bottom) {
                    targetTop = ps.sourcePos.top + ps.srcHeight;
                    ps.hasPosition.top = false;
                    ps.hasPosition.middle = false;
                    ps.hasPosition.bottom = true;
                }
            }


            // Nudge up and down for left/right/middle
            if ( (ps.hasPosition.left || ps.hasPosition.right || ps.hasPosition.middle) && !ps.hasBeenShuffled ) {

                // Shuffle up if hitting bottom boundary
                if ( (targetTop + ps.tooltipHeight) > ps.containerPos.bottom ) {
                    targetTop -= (targetTop + ps.tooltipHeight) - ps.containerPos.bottom;
                }

                // Shuffle down if hitting top boundary
                if ( ps.containerPos.top > targetTop ) {
                    targetTop = ps.containerPos.top;
                }
            }

            // Flip to top or bottom for top/bottom/center
            if ( (ps.hasPosition.top || ps.hasPosition.bottom) && (ps.hasPosition.center || ps.hasBeenShuffled) ) {

                ps.hasPosition.top = false;
                ps.hasPosition.middle = false;
                ps.hasPosition.bottom = false;

                // Switch to top if hitting bottom boundary
                if ( (targetTop + ps.tooltipHeight) > ps.containerPos.bottom ) {
                    ps.hasPosition.top = true;
                    targetTop = ps.sourcePos.top - ps.tooltipHeight;
                }

                // Switch to bottom if hitting top boundary
                if ( ps.containerPos.top > targetTop ) {
                    ps.hasPosition.bottom = true;
                    targetTop = ps.sourcePos.top + ps.srcHeight;
                }
            }

            // Position tooltip and reset our visibility and display properties
            tooltip.css({ left: targetLeft + 'px', top: targetTop + 'px', visibility: 'visible', display: 'none' });
        };

        var addAccessibility = function() {
            var tooltipId = tooltip.attr('id');
            var statusId = status.attr('id');

            element.append(status);
            tooltip.attr('role', 'tooltip');
            element.attr('aria-describedby', tooltipId);
            element.attr('aria-owns', tooltipId + ' ' + statusId);
            element.attr('aria-controls', tooltipId + ' ' + statusId);
        };

        var close = function() {
            // Default tooltip behaviour
            // element.attr('title', element.data('field-title')).removeAttr('field-title');

            if (tooltip && tooltip.data('tooltip-interactive') && tooltip.data('tooltip-mouseover')) {
                // This element is interactive and the user is hovering over the tooltip. Do not close - it will handle close events by itself
                return false;
            }

            if (tooltip && tooltip.data('tooltip-persist')) {
                // This element is 'persist'ent. Do not close - it will handle close events by itself
                return false;
            }

            that.hide();
        };

        // Public methods
        this.show = function() {
            // If tooltip has not already been created, create it
            if (!element.is('.tooltip-exists')) {
                if (!create()) {
                    return false;
                }
            }

            positionTooltip();

            if (!that.settings.allowMultiple) {
                // Hide other tooltips
                $('div.tooltip-box').stop().hide();
            }

            if (tooltip) {
                tooltip.fadeIn(100);
                status.text( $.trim(tooltip.text().replace(/\s+/g, " ")) );
            }
            element.data('tooltip-showing', true);
        };

        this.hide = function() {
            if (tooltip) {
                tooltip.stop().fadeOut(50);
            }
            element.data('tooltip-showing', false);
        };


        this.is_showing = function() {
            if (element.data('tooltip-showing')) {
                return true;
            } else {
                return false;
            }
        }


        // Private initialisation method - because it initializes itself
        var init = function() {
            // Setup a generic tooltip container
            if (!$('#tooltip-template').length) {
                $('body').append($('<div />').attr('id', 'tooltip-template').addClass('tooltip-box'));
            }

            if (element.is('.persist')) {
                // If element is persistent - bind to a click event
                element.click(function(event) {
                    event.preventDefault();
                    that.show();
                    return false;
                });

            } else {
                // Bind to mouse enter/leave
                element.on('click focus mouseenter', function(e) {

                    // If our element is a dummy link (we use dummy links as they are accessible
                    // and can be tabbed to) we can stop propogation of the event
                    if (e.type == 'click' && (element.attr('href') == '#' || element.attr('href') == '')) {
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    // If tooltip is already showing
                    if (that.is_showing()) {
                        // Stop creation of tooltip
                        return;
                    }

                    if (closeTimer) {
                        clearTimeout(closeTimer);
                    }

                    timer = setTimeout(function() {
                        that.show();
                    }, that.settings.idleTimeout);
                });

                element.on('blur mouseleave', function(e) {
                    e.preventDefault();
                    if (timer) {
                        clearTimeout(timer);
                    }

                    if (tooltip && tooltip.data('tooltip-interactive')) {

                        closeTimer = setTimeout(function() {
                            close();
                        }, that.settings.idleInteractiveClose);

                    } else {
                        close();
                    }
                });
            }

            element.keypress(function(e) {
                if ( e.which == 13 ) {
                    element.trigger('click');
                }
            });
        };

        var that = this; // Allow private objects access to 'this' via 'that'
        init();
    }

    $.fn.cwTooltip = function(options) {
        return this.each(function() {
            // Fix default title/tooltip behaviour and move the value to a supported data attribute
            var titleAttr = $(this).attr('title');
            if (titleAttr && titleAttr != '') {
                $(this).attr('data-field-title', titleAttr);
                $(this).removeAttr('title');
            }

            if (typeof $.fn.html5data == 'function') {
                var settings = $.extend({}, options, $(this).html5data('tooltip'));
            }

            $(this).data('tooltip', new TooltipClass(this, settings));
        });
    };
})(jQuery);