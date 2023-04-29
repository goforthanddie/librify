function loginOk(spotify, access_token) {
    $('#login').hide();
    $('#loggedin').show();

    localStorage.setItem('login', '1');

    //let spotify = new Spotify();
    spotify.accessToken = new AccessToken(access_token, 'Bearer');
    spotify.getDevices();
    spotify.getSavedAlbums(0, 50);

    console.log('login ok');
}

// Listeners
window.addEventListener("load", function () {
    const spotify = new Spotify();
    // debug reasons only:
    window.sptf = spotify;
    //$('#loggedin').hide();
    //$('#selectDevices').hide();

    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

    let access_token = localStorage.getItem('access_token');

    // test if there is a code, meaning we got redirected from spotify auth page and no access_token
    if (code && access_token == null) {
        spotify.getAccessToken(code);
    } else if (access_token != null) {
        console.log('access_token != null');
        // Todo: test if access_token is still valid?
        loginOk(spotify, access_token);
    }

    $('#buttonReloadLibrary').click(function () {
        spotify.getSavedAlbums(0, 50);
    });

    document.getElementById('buttonReloadDevices').addEventListener('click', function () {
        spotify.getDevices();
    }, false);

    document.getElementById('buttonLogout').addEventListener('click', function () {
        localStorage.clear();
        $('#login').show();
        $('#loggedin').hide();
    }, false);

    document.getElementById('buttonLogin').addEventListener('click', function () {
        console.log('login-button:click()');
        Spotify.authorize();
    }, false);
});
