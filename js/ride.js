/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};

(function rideScopeWrapper($) {
    var authToken;
    var isTokenValid = false;

    // Get auth token and enable request button when ready
    WildRydes.authToken
        .then(function setAuthToken(token) {
            if (token) {
                authToken = token;
                isTokenValid = true;
                $('#request').prop('disabled', false);
            } else {
                handleAuthFailure();
            }
        })
        .catch(handleAuthFailure);

    function handleAuthFailure(error) {
        console.error('Authentication Error:', error);
        alert('Session expired or not authenticated. Please sign in again.');
        window.location.href = '/signin.html';
    }

    function requestUnicorn(pickupLocation) {
        if (!validatePickup(pickupLocation)) return;

        // Revalidate token before request
        WildRydes.authToken
            .then(function(token) {
                authToken = token;
                makeAPIRequest(pickupLocation);
            })
            .catch(handleAuthFailure);
    }

    function validatePickup(pickup) {
        if (!pickup || !pickup.latitude || !pickup.longitude) {
            alert('Please select a valid pickup location on the map.');
            return false;
        }
        return true;
    }

    function makeAPIRequest(pickup) {
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/ride',
            headers: { Authorization: authToken },
            data: JSON.stringify({
                PickupLocation: {
                    Latitude: pickup.latitude,
                    Longitude: pickup.longitude
                }
            }),
            contentType: 'application/json',
            success: handleRequestSuccess,
            error: handleRequestError
        });
    }

    function handleRequestSuccess(result) {
        console.debug('API Success:', result);

        // Defensive checks
        if (!result || typeof result !== 'object') {
            displayUpdate('Error: Invalid response from server.');
            return;
        }

        if (result.message === "Unauthorized") {
            alert("Your session has expired or you are not authorized. Please sign in again.");
            window.location.href = '/signin.html';
            return;
        }

        if (!result.Unicorn) {
            displayUpdate('Your unicorn is on the way!');
            return;
        }

        var unicorn = result.Unicorn;
        var pronoun = 'their';
        if (unicorn.Gender) {
            pronoun = unicorn.Gender === 'Male' ? 'his' : (unicorn.Gender === 'Female' ? 'her' : 'their');
        }

        displayUpdate(unicorn.Name + ', your ' + unicorn.Color + ' unicorn, is on ' + pronoun + ' way.');

        animateArrival(function animateCallback() {
            displayUpdate(unicorn.Name + ' has arrived. Giddy up!');
            WildRydes.map.unsetLocation();
            $('#request').prop('disabled', true).text('Set Pickup');
        });
    }

    function handleRequestError(jqXHR) {
        console.error('API Error:', jqXHR);
        var userMessage = 'Error requesting ride';

        try {
            var response = JSON.parse(jqXHR.responseText);
            if (jqXHR.status === 401 || response.message === 'Unauthorized') {
                handleAuthFailure();
                return;
            }
            userMessage = response.Error || response.message || userMessage;
        } catch (e) {
            userMessage = jqXHR.responseText || userMessage;
        }

        alert(userMessage + '\nPlease try again.');
    }

    // UI Initialization
    $(function init() {
        $('#request')
            .click(handleRequestClick)
            .prop('disabled', true); // Disable until token ready

        $(WildRydes.map).on('pickupChange', handlePickupChanged);

        WildRydes.authToken.then(function updateAuthMessage(token) {
            if (token) {
                displayUpdate('You are authenticated. Click to see your <a href="#authTokenModal" data-toggle="modal">auth token</a>.');
                $('.authToken').text(token);
            }
        });

        if (!_config.api.invokeUrl) {
            $('#noApiMessage').show();
        }
    });

    function handlePickupChanged() {
        $('#request')
            .text('Request Unicorn')
            .prop('disabled', !isTokenValid);
    }

    function handleRequestClick(event) {
        event.preventDefault();
        if (!isTokenValid) {
            alert('Authentication check in progress...');
            return;
        }
        requestUnicorn(WildRydes.map.selectedPoint);
    }

    function animateArrival(callback) {
        var dest = WildRydes.map.selectedPoint;
        var origin = {};

        if (dest.latitude > WildRydes.map.center.latitude) {
            origin.latitude = WildRydes.map.extent.minLat;
        } else {
            origin.latitude = WildRydes.map.extent.maxLat;
        }

        if (dest.longitude > WildRydes.map.center.longitude) {
            origin.longitude = WildRydes.map.extent.minLng;
        } else {
            origin.longitude = WildRydes.map.extent.maxLng;
        }

        WildRydes.map.animate(origin, dest, callback);
    }

    // The missing function!
    function displayUpdate(text) {
        $('#updates').append($('<li>' + text + '</li>'));
    }

}(jQuery));
