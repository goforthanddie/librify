// Listeners
window.addEventListener("load", () => {
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

    $('#buttonUpdateLibrary').click(function () {
        $(this).attr('disabled', true);
        spotify.getSavedAlbums(0, 50);
    });

    $('#buttonGetGenres').click(function () {
        spotify.getGenres(0, 50);
    });

    $('#buttonReduceGenres').click(function () {
        $(this).attr('disabled', true);
        spotify.reduceGenres();
        $(this).attr('disabled', false);
    });

    $('#buttonReduceGenresFurther').click(function () {
        spotify.reduceGenresFurther();
    });

    $('#buttonManageGenres').click(function () {
        // toggle first, because reduceGenresManually only updates when it is visible
        $('#viewManageGenres').toggle();
        spotify.reduceGenresManually();
    });

    // todo: make this a function in class Spotify
    $('button#buttonStoreGenresSub').click(() => {
        console.log('buttonStoreGenresSub click');

        $('button#buttonStoreGenresSub').attr('disabled', true);
        let selectGenreMain = $('select#genreMain');
        let genreMain = spotify.library.genres.find(element => element.id === selectGenreMain.val());
        //console.log(genreMain);
        if(genreMain !== undefined) {
            //console.log(selectGenreSub.children(':selected'));
            // add all the artists of the found sub genres to the main genre
            let selectGenreSub = $('select#genresSub');
            selectGenreSub.val().forEach(_idGenreSub => {
                console.log(_idGenreSub);
                let genreSubIdx = spotify.library.genres.findIndex(element => element.id === _idGenreSub);
                //console.log(this.library.genres[genreSubIdx]);
                if(genreSubIdx !== -1) {
                    spotify.library.genres[genreSubIdx].artists.forEach(_artist => {
                        genreMain.addArtist(_artist);
                    });
                    //genreMain.addSubGenre(this.library.genres[genreSubIdx]);

                    // remove sub genre from main array
                    spotify.library.genres.splice(genreSubIdx, 1);
                }
            });

            $('input#genresSubKeyword').val('');
            //let selectGenreMain = $('select#genreMain');
            selectGenreMain.empty();
            spotify.library.genres.forEach(_genre => {
                selectGenreMain.append($('<option />').val(_genre.id).text(_genre.name));
            });
            selectGenreMain.val(spotify.library.genres[0].id).trigger('change');

            // sort artists
            genreMain.artists.sort((a, b) => a.name.localeCompare(b.name));

            // store new genres
            spotify.library.saveToLocalStorage();
            //this.storeGenres();
            //this.populateViewLibrary();
        }
    });

    let selectSortAlbums = $('#selectSortAlbums');
    selectSortAlbums.append($('<option />').val(SORT_BY_NAME).text(SORT_BY_NAME));
    selectSortAlbums.append($('<option />').val(SORT_BY_YEAR).text(SORT_BY_YEAR));

    // preselect default option
    $('#selectSortAlbums > option[value=' + spotify.options.sortAlbums + ']').attr('selected', 'selected');

    selectSortAlbums.change(function () {
        console.log(spotify.options.sortAlbums);
        spotify.options.sortAlbums = selectSortAlbums.children(':selected').attr('value');
        spotify.populateViewLibrary();
    });

    let selectView = $('#selectView');
    selectView.append($('<option />').val(VIEW_ARTIST).text(VIEW_ARTIST));
    selectView.append($('<option />').val(VIEW_GENRE).text(VIEW_GENRE));

    // preselect default option
    $('#selectView > option[value=' + spotify.options.view + ']').attr('selected', 'selected');

    selectView.change(function () {
        console.log(spotify.options.view);
        spotify.options.view = selectView.children(':selected').attr('value');
        spotify.populateViewLibrary();
    });

    $('#selectDevices').change(function () {
        spotify.options.selectedDevice = $('#selectDevices').children(':selected').attr('id');
    });

    $('#buttonReloadDevices').click(function () {
        $(this).attr('disabled', true);
        spotify.getDevices();
    });

    $('#buttonLogout').click(function () {
        Utils.logout();
    });

    $('#buttonLogin').click(function () {
        console.log('login-button:click()');
        Spotify.authorize();
    });

    $('#buttonRedo').click(() => {
        console.log('#buttonRedo.click()')
        if (spotify.library.stateNavigator.currentStateIdx < spotify.library.stateNavigator.states.length - 1) {
            console.log('#buttonRedo.click()');
            let state = spotify.library.stateNavigator.redo();
            // this needs to go through setItem and readFromLocalStorage to have the reviver called
            localStorage.setItem('genres', state.genres);
            localStorage.setItem('artists', state.artists);
            //spotify.readFromLocalStorage();
            spotify.library.readFromLocalStorage(false);
            //spotify.populateViewLibrary();
        }
    });

    $('#buttonUndo').click(() => {
        console.log('#buttonUndo.click()')
        if (spotify.library.stateNavigator.currentStateIdx > 0) {
            console.log('#buttonUndo.click() in if currentStateIdx=' + spotify.library.stateNavigator.currentStateIdx);
            let state = spotify.library.stateNavigator.undo();
            // this needs to go through setItem and readFromLocalStorage to have the reviver called
            localStorage.setItem('genres', state.genres);
            localStorage.setItem('artists', state.artists);
            //spotify.readFromLocalStorage();
            spotify.library.readFromLocalStorage(false);
            //spotify.populateViewLibrary();
        }
    });

    $('#buttonSaveData').click(function () {
        let data = "data:text/json;charset=utf-8," + encodeURIComponent('{"genres": ' + spotify.library.stateNavigator.getCurrentState().genres + ', "artists":' + spotify.library.stateNavigator.getCurrentState().artists + '}');
        let aSaveData = document.getElementById('aSaveData');
        aSaveData.href = data;
        aSaveData.download = 'librify.json';
        aSaveData.click();
    });

    $('#buttonLoadData').click(function () {
        let input = document.createElement('input');
        input.type = 'file';
        input.onchange = () => {
            let file = input.files[0];
            let fr = new FileReader();
            fr.onload = function receivedText() {
                let data = JSON.parse(fr.result);
                if (data.artists !== null) {
                    spotify.library.artists = JSON.parse(JSON.stringify(data.artists), Utils.reviverArtists);
                    //spotify.storeArtists();
                }
                if (data.genres !== null) {
                    spotify.library.genres = JSON.parse(JSON.stringify(data.genres), spotify.library.reviverGenres);
                    //spotify.storeGenres();
                }
                spotify.library.saveToLocalStorage();
                //spotify.populateViewLibrary();
            };
            fr.readAsText(file);
        }
        input.click();
    });

    $('input#searchKeyword').on('input', function () {
        spotify.filterViewLibrary();
    });

    $('#buttonAddGenre').click(function () {
        console.log('buttonAddGenre');
        let inputGenreName = $('input#addGenre');
        let genreName = inputGenreName.val();
        console.log(genreName);
        if (genreName.length > 0 && spotify.library.genres.find(element => element.name === genreName) === undefined) {
            console.log('a');
            let genre = new Genre(genreName);
            spotify.library.genres.push(genre);
            spotify.library.saveToLocalStorage();
            //spotify.storeGenres();
            //spotify.populateViewLibrary();
            inputGenreName.val('');
        } else {
            console.log('genre already existing or name is empty. not adding.')
        }
    });

    $('#buttonRemoveEmptyGenres').click(function () {
        $(this).attr('disabled', true);
        spotify.library.removeEmptyGenres();
        //spotify.removeEmptyGenres();
        $(this).attr('disabled', false);
    });
});
