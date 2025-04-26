/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};

(function rideScopeWrapper($) {
    let authToken;
    let isTokenValid = false;

    // Enhanced token validation
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
        alert('Session expired. Please sign in again.');
        window.location.href = '/signin.html';
    }

    function requestUnicorn(pickupLocation) {
        if (!validatePickup(pickupLocation)) return;
        
        // Token revalidation before request
        WildRydes.authToken
            .then(token => {
                authToken = token;
                makeAPIRequest(pickupLocation);
            })
            .catch(handleAuthFailure);
    }

    function validatePickup(pickup) {
        if (!pickup?.latitude || !pickup?.longitude) {
            alert('Please select a valid pickup location on the map.');
            return false;
        }
        return true;
    }

    function makeAPIRequest(pickup) {
        $.ajax({
            method: 'POST',
            url: `${_config.api.invokeUrl}/ride`,
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
        
        if (!result?.Unicorn) {
            displayUpdate('Your unicorn is on the way!');
            return;
        }

        const { Name, Color, Gender = 'their' } = result.Unicorn;
        const pronoun = Gender === 'Male' ? 'his' : Gender === 'Female' ? 'her' : 'their';
        
        displayUpdate(`${Name}, your ${Color} unicorn, is on ${pronoun} way.`);
        animateArrival(() => {
            displayUpdate(`${Name} has arrived. Giddy up!`);
            WildRydes.map.unsetLocation();
            $('#request').prop('disabled', true).text('Set Pickup');
        });
    }

    function handleRequestError(jqXHR) {
        console.error('API Error:', jqXHR);
        let userMessage = 'Error requesting ride';

        try {
            const response = JSON.parse(jqXHR.responseText);
            if (jqXHR.status === 401 || response?.message === 'Unauthorized') {
                userPool.getCurrentUser()?.signOut();
                handleAuthFailure();
                return;
            }
            userMessage = response?.Error || response?.message || userMessage;
        } catch (e) {
            userMessage = jqXHR.responseText || userMessage;
        }

        alert(`${userMessage}\nPlease try again.`);
    }

    // UI Initialization
    $(function init() {
        $('#request')
            .click(handleRequestClick)
            .prop('disabled', true); // Disable until token ready

        $(WildRydes.map).on('pickupChange', handlePickupChanged);
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

    // Rest of your existing animation and display functions
    // (animateArrival, displayUpdate) remain unchanged
}(jQuery));
