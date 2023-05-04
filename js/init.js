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
        Utils.login(spotify, access_token);
    }

    $('#buttonReloadLibrary').click(function () {
        spotify.getSavedAlbums(0, 50);
    });

    $('#buttonGetGenres').click(function() {
        spotify.getGenres(0, 50);
    });

    $('#buttonReduceGenres').click(function() {
        spotify.reduceGenres();
    });

    let selectSortAlbums = $('#selectSortAlbums');
    selectSortAlbums.change(function() {
        spotify.options.sortAlbums = selectSortAlbums.children(':selected').attr('id');
        spotify.populateViewLibraryFromArtists(spotify.artists);
    });

    $('#buttonShowByGenre').click(function() {
        spotify.populateViewLibraryFromGenres(spotify.genres);
    });

    $('#buttonShowByArtist').click(function() {
        spotify.populateViewLibraryFromArtists(spotify.artists);
    });

    $('#buttonReloadDevices').click(function() {
        spotify.getDevices();
    });

    $('#buttonLogout').click(function() {
        Utils.logout();
    });

    $('#buttonLogin').click(function() {
        console.log('login-button:click()');
        Spotify.authorize();
    });
});
