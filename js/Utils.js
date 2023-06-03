class Utils {

	static login(spotify, access_token) {
		$('#login').hide();
		$('#loggedin').show();


		spotify.accessToken = new AccessToken(access_token, 'Bearer');
		spotify.getDevices();

		spotify.libraryRenderer.populateViewLibrary();
		//spotify.getGenres(0, 50);
		//spotify.getSavedAlbums(0, 50);

		// remove parameters from url
		window.history.replaceState(null, '', window.location.pathname);
		console.log('login ok');
	}

	static logout() {
		localStorage.clear();
		$('#login').show();
		$('#loggedin').hide();

		console.log('logout')
	}

	static replacerGenres(key, value) {
		// replace artist objects by artist id to save space
		if(value instanceof Artist) {
			return {dataType: Artist.name, id: value.id};
		}
		return value;
	}

	static replacerArtists(key, value) {
		// remove genres to save space
		//console.log(key);
		if(key === 'genres') {
			//console.log('genres');
			return undefined;
		}
		return value;
	}

	// custom reviver to parse the stringified library back into objects
	static reviverArtists(key, value) {
		if(typeof value === 'object' && value !== null) {
			if(value.dataType === Artist.name) {
				let artist = new Artist(value.id, value.name);
				//artist.genres = value.genres;
				value.albums.forEach(_album => {
					// re-stringify and parse to force invocation of === 'Album'
					let album = JSON.parse(JSON.stringify(_album), Utils.reviverArtists);
					//let album = new Album(_album.id, _album.name); // you could probably re-stringify the object and parse separately to achieve invocation of the case === 'Album'
					artist.addAlbum(album);
				});
				return artist;
			} else if(value.dataType === Album.name) {
				return new Album(value.id, value.name, value.releaseDate, value.releaseDatePrecision);
			} else if(value.dataType === Genre.name) {
				let genre = new Genre(value.name);
				value.artists.forEach(_artist => {
					let artist = JSON.parse(JSON.stringify(_artist), Utils.reviverArtists);
					genre.addArtist(artist);
				});
				return genre;
			}
		}
		return value;
	}

	// custom reviver to parse the stringified genres back into objects
	// need to bind a library context to this function
	static reviverGenres(key, value) {
		//console.debug('Utils.reviverGenres()');
		let artist;
		if(typeof value === 'object' && value !== null) {
			if(value.dataType === Artist.name) {
				artist = this.library.artists.find(element => element.id === value.id);
				return artist;
			} else if(value.dataType === Genre.name) {
				let genre = new Genre(value.name);
				value.artists.forEach(_artist => {
					artist = JSON.parse(JSON.stringify(_artist), Utils.reviverArtists);
					genre.addArtist(artist);
				});
				return genre;
			}
		}
		return value;
	};
}

// case insensitive filter
jQuery.expr[':'].icontains = function(a, i, m) {
	return jQuery(a).text().toUpperCase()
		.indexOf(m[3].toUpperCase()) >= 0;
};