class Utils {

    static login(spotify, access_token) {
        $('#login').hide();
        $('#loggedin').show();

        localStorage.setItem('login', '1');

        spotify.accessToken = new AccessToken(access_token, 'Bearer');
        spotify.getDevices();

        console.log('populating library view from stored artists');
        spotify.populateViewLibrary();
        //spotify.getGenres(0, 50);
        //spotify.getSavedAlbums(0, 50);

        console.log('login ok');
    }

    static logout() {
        localStorage.clear();
        $('#login').show();
        $('#loggedin').hide();

        console.log('logout')
    }

    // custom reviver to parse the stringified library back into objects
    static reviver(key, value) {
        if(typeof value === 'object' && value !== null) {
            if (value.dataType === Artist.name) {
                let artist = new Artist(value.id, value.name);
                artist.genres = value.genres;
                value.albums.forEach(_album => {
                    // re-stringify and parse to force invocation of === 'Album'
                    let album = JSON.parse(JSON.stringify(_album), Utils.reviver);
                    //let album = new Album(_album.id, _album.name); // you could probably re-stringify the object and parse separately to achieve invocation of the case === 'Album'
                    artist.addAlbum(album);
                });
                return artist;
            } else if(value.dataType === Album.name) {
                return new Album(value.id, value.name, value.releaseDate, value.releaseDatePrecision);
            } else if(value.dataType === Genre.name) {
                let genre = new Genre(value.name);
                value.artists.forEach(_artist => {
                    let artist = JSON.parse(JSON.stringify(_artist), Utils.reviver);
                    genre.addArtist(artist);
                });
                return genre;
            }
        }
        return value;
    }
}