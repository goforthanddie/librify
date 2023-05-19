// Listeners
window.addEventListener("load", ()=> {
    let spotify = new Spotify();
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

    $('#buttonReduceGenresFurther').click(function() {
        spotify.reduceGenresFurther();
    });

    $('#buttonReduceGenresManually').click(function() {
        spotify.reduceGenresManually();
        $('#viewReduceGenresManually').toggle();
    });

    let selectSortAlbums = $('#selectSortAlbums');
    selectSortAlbums.append($('<option />').val(SORT_BY_NAME).text(SORT_BY_NAME));
    selectSortAlbums.append($('<option />').val(SORT_BY_YEAR).text(SORT_BY_YEAR));

    // preselect default option
    $('#selectSortAlbums > option[value='+spotify.options.sortAlbums+']').attr('selected', 'selected');

    selectSortAlbums.change(function() {
        console.log(spotify.options.sortAlbums);
        spotify.options.sortAlbums = selectSortAlbums.children(':selected').attr('value');
        spotify.populateViewLibrary();
    });

    let selectView = $('#selectView');
    selectView.append($('<option />').val(VIEW_ARTIST).text(VIEW_ARTIST));
    selectView.append($('<option />').val(VIEW_GENRE).text(VIEW_GENRE));

    // preselect default option
    $('#selectView > option[value='+spotify.options.view+']').attr('selected', 'selected');

    selectView.change(function() {
        console.log(spotify.options.view);
        spotify.options.view = selectView.children(':selected').attr('value');
        spotify.populateViewLibrary();
    });

    $('#selectDevices').change(function() {
        spotify.options.selectedDevice = $('#selectDevices').children(':selected').attr('id');
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

    $('#buttonRedo').click(() => {
        console.log('#buttonRedo.click()')
        if(spotify.stateNavigator.currentStateIdx < spotify.stateNavigator.states.length - 1) {
            console.log('#buttonRedo.click()');
            let state = spotify.stateNavigator.redo();
            localStorage.setItem('genres', state.genres);
            localStorage.setItem('artists', state.artists);
            spotify.readFromLocalStorage();
            spotify.populateViewLibrary(false);
        }
    });

    $('#buttonUndo').click(() => {
        console.log('#buttonUndo.click()')
        if(spotify.stateNavigator.currentStateIdx > 0) {
            console.log('#buttonUndo.click() in if currentStateIdx=' + spotify.stateNavigator.currentStateIdx);
            let state = spotify.stateNavigator.undo();
            localStorage.setItem('genres', state.genres);
            localStorage.setItem('artists', state.artists);
            spotify.readFromLocalStorage();
            spotify.populateViewLibrary(false);
        }
    });

    $('#buttonSaveData').click(function () {
        let data = "data:text/json;charset=utf-8," + encodeURIComponent('{"genres": '+spotify.stateNavigator.getCurrentState().genres+', "artists":'+spotify.stateNavigator.getCurrentState().artists+'}' );
        let aSaveData = document.getElementById('aSaveData');
        aSaveData.href = data;
        aSaveData.download = 'librify.json';
        aSaveData.click();
    });

    $('#buttonLoadData').click(function () {
        let input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            let file = input.files[0];
            let fr = new FileReader();
            fr.onload = function receivedText() {
                let data = JSON.parse(fr.result);
                if(data.artists !== null) {
                    spotify.artists = JSON.parse(JSON.stringify(data.artists), Utils.reviverArtists);
                    spotify.storeArtists();
                }
                if(data.genres !== null) {
                    spotify.genres = JSON.parse(JSON.stringify(data.genres), spotify.reviverGenres);
                    spotify.storeGenres();
                }
                spotify.populateViewLibrary();
            };
            fr.readAsText(file);
        }
        input.click();
    });

    $('input#searchKeyword').on('input', function() {
        spotify.filterViewLibrary();
    });
});
