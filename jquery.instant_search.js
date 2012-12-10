(function($) {
    /**
     * Upgrades a search form to utilise ajax for instant results
     *
     * @param idleTimeout         The number of milliseconds after a keypress before a search is performed
     * @param inputSelector       String used for selecting the input field element
     * @param resultsSelector     String used for selecting the results list element
     * @param resultItemSelector     String used for creating the results list item elements
     * @param noResultsText     String used when no results are matched
     * @param errorText     String used when an error occurs in the AJAX call
     */
    function AutocompleteSearchClass(node, options)  {

        // Public Properties
        this.settings = $.extend({
            idleTimeout: 300,
            idleInteractiveTimeout: 500,
            inputSelector: 'input[type="search"]',
            resultsSelector: 'ul.results, ol.results',
            resultItemSelector: '<li />',
            noResultsText: 'No results..',
            errorText: 'An error occurred please try again..'
        }, options);

        this.url = '';
        this.term = '';
        this.cache = [];

        // Private Properties
        var timer;
        var form = $(node);
        var input = form.find(this.settings.inputSelector);
        var resultsContainer = form.find(this.settings.resultsSelector);

        // Public API
        this.api = function(url, term, callback) {
            var url = (url || this.url);
            var term = (term || this.term);

            if (that.cache[term]) {
                callback( that.cache[term] );
                return true;
            }

            $.ajax({
                url: url,
                dataType: 'json',
                data: {q: term},
                error: function(jqXHR, textStatus, errorThrown) {
                    errorResults(textStatus);
                },
                success: function(data) {
                    if (data.results) {
                        that.cache[term] = data.results;
                        if (that.cache.length >= 50) {
                            that.cache = [];
                        }
                    }

                    var resultArray = data.results;
                    if (resultArray && resultArray.length >= 1) {
                        callback( resultArray );
                    } else {
                        callback( false );
                    }
                }
            });
        };

        var setSelected = function(result) {
            resultsContainer.find('.selected').removeClass('selected');
            $(result).addClass('selected');
        };

        // Navigates up/down the search list
        var selectResult = function(direction) {
            var resultItems = resultsContainer.children();
            var currentlySelected = resultsContainer.find('.selected') || false;

            if (!resultItems.length) {
                return false;
            } else {
                var firstResult = resultItems[0];
                var lastResult = resultItems[resultItems.length-1];
            }

            switch (direction) {
                case 'up':
                    if (currentlySelected.length && (currentlySelected[0] != firstResult)) {
                        setSelected( currentlySelected.prev() );
                    } else {
                        setSelected( lastResult );
                    }
                    break;

                case 'down':
                    if (currentlySelected.length && (currentlySelected[0] != lastResult)) {
                        setSelected( currentlySelected.next() );
                    } else {
                        setSelected( firstResult );
                    }
                    break;

                case 'first':
                    setSelected( firstResult );
                    break;

                case 'last':
                    setSelected( lastResult );
                    break;
            }
        };

        // Private PopulateSearchResults callback
        var populateSearchResults = function(results) {
            resultsContainer.text('');
            if (results && results.length >= 1) {
                for (var i = 0; i < results.length; i++) {

                    // Generate base HTML elements
                    var result = results[i];
                    var linkElement = $('<a />').attr('href', result.url).data('resultId', result.id);
                    var resultElement = $(that.settings.resultItemSelector);

                    // Create Result
                    linkElement.html( result.title ).append( $('<span />').text(' - ' + result.category) );
                    resultElement.html(linkElement);
                    resultsContainer.append(resultElement);
                }
                showResults();

            } else {
                noResults();
            }
        };

        var noResults = function() {
            var noResultsItem = $(that.settings.resultItemSelector).text(that.settings.noResultsText);
            resultsContainer.html( noResultsItem );
            resultsContainer.slideDown();
        };

        var errorResults = function(errorText) {
            var errorResultsItem = $(that.settings.resultItemSelector).text(that.settings.errorText);
            resultsContainer.html( errorResultsItem );
            resultsContainer.slideDown();
        };

        var showResults = function() {
            resultsContainer.slideDown();
        };

        var hideResults = function() {
            if (!resultsContainer.data('inUse')) {
                resultsContainer.slideUp();
            }
        };

        // Handles keyboard interaction (enter, arrow up, arrow down)
        var handleInteraction = function(event) {
            // Check for arrow keys
            switch (event.keyCode) {
                //Up Arrow
                case 38:
                    selectResult( 'up' );
                    event.preventDefault();
                    event.stopPropagation();
                    break;

                //Down Arrow
                case 40:
                    selectResult( 'down' );
                    event.preventDefault();
                    event.stopPropagation();
                    break;

                //Enter Key
                case 13:
                    var currentSelection = resultsContainer.find('.selected a');
                    if (currentSelection.length) {
                        event.preventDefault();
                        event.stopPropagation();
                        window.location.href = $( currentSelection[0] ).attr('href');
                        return false;
                    }
                    break;
            }
        };

        // Handles search triggering
        var handleSearch = function(event) {

            var prevTerm = that.term;
            that.term = input.val();

            if (event.charCode && String.fromCharCode(event.charCode)) {
                that.term += String.fromCharCode(event.charCode);
            }

            if (that.term == prevTerm) {
                return true;
            }

            if (timer) { clearTimeout(timer) }

            if (that.term.length >= 2){
                timer = setTimeout(function() {
                    that.api(that.url, that.term, populateSearchResults);
                }, that.settings.idleTimeout);
            } else {
                hideResults();
            }
        };


        // Private initialisation method - because it initializes itself
        var init = function() {
            that.url = (form.data('ajaxAction') || form.attr('action'));
            input.keydown( handleInteraction );
            input.keyup( handleSearch );
            input.blur( hideResults );
            input.focus( function(){
                if (input.val().length >= 3) {
                    showResults();
                }
            } );

            resultsContainer.mouseenter(function(e) {
                resultsContainer.data('inUse', true);
            });

            resultsContainer.mouseleave(function(e) {
                resultsContainer.data('inUse', false);

                if (!input.is(':focus')) {
                    input.trigger('blur');
                };
            });
        };

        var that = this; // Allow private objects access to 'this' via 'that'
        init();
    }

    $.fn.cwAutocompleteSearch = function(options) {
        return this.each(function() {
            $(this).data('autocompleteSearch', new AutocompleteSearchClass(this, options));
        });
    };
})(jQuery);
