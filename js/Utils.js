class Utils {

	static login(access_token) {
		console.debug('login()');
		$('#preLogin').hide();
		$('#postLogin').show();


		const options = new Options();
		const library = new Library();
		const statusManager = new StatusManager($('#viewStatus'));
		const stateManager = new StateManager(library, options);
		const spotify = new Spotify(library, options, statusManager);
		const libraryRenderer = new LibraryRenderer(spotify, library, options, stateManager);

		// debug reasons only:
		window.sptf = spotify;
		window.lRenderer = libraryRenderer;

		library.addUpdateListener(stateManager.saveToLocalStorage.bind(stateManager));

		library.addUpdateListener(libraryRenderer.populateSelectViewBy.bind(libraryRenderer));
		library.addUpdateListener(libraryRenderer.populateSelectSortAlbumsBy.bind(libraryRenderer));

		library.addUpdateListener(libraryRenderer.populateClusterGenres.bind(libraryRenderer));
		library.addUpdateListener(libraryRenderer.populateViewLibrary.bind(libraryRenderer));

		spotify.addUpdateListener(libraryRenderer.populateSelectDevices.bind(libraryRenderer));

		// we need to call this when all the update listeners have been added
		stateManager.loadFromLocalStorage(true);

		libraryRenderer.bindButtons();
		libraryRenderer.bindOthers();

		spotify.accessToken = new AccessToken(access_token, 'Bearer');
		spotify.getDevices();

		// remove parameters from url
		window.history.replaceState(null, '', window.location.pathname);
	}

	static logout() {
		console.debug('logout()');
		localStorage.clear();
		$('#preLogin').show();
		$('#postLogin').hide();
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
					artist.addChild(album);
				});
				return artist;
			} else if(value.dataType === Album.name) {
				return new Album(value.id, value.name, value.releaseDate, value.releaseDatePrecision);
			} else if(value.dataType === Genre.name) { // todo: this might be not needed anymore
				console.log('got genre');
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
				artist = this.artists.find(element => element.id === value.id);
				return artist;
			} else if(value.dataType === Genre.name) {
				let genre = new Genre(value.name);
				value.artists.forEach(_artist => {
					// make sure we have the same object here
					artist = this.artists.find(element => element.id === _artist.id);
					//artist = JSON.parse(JSON.stringify(_artist), Utils.reviverArtists);
					genre.addArtist(artist);
					genre.addChild(artist);
				});
				return genre;
			}
		}
		return value;
	};

	static reviverOptions(key, value) {
		if(typeof value === 'object' && value !== null) {
			if(value.dataType === Options.name) {
				let options = new Options();
				options.view = value.view;
				options.sortAlbums = value.sortAlbums;
				options.selectedDevice = value.selectedDevice;
				return options;
			}
		}
		return value;
	}
}

// case insensitive filter
jQuery.expr[':'].icontains = function(a, i, m) {
	return jQuery(a).text().toUpperCase()
		.indexOf(m[3].toUpperCase()) >= 0;
};

// generate unique ids for objects
const uniqueId = (() => {
	let currentId = 0;
	const map = new WeakMap();

	return (object) => {
		if (!map.has(object)) {
			map.set(object, ++currentId);
		}

		return map.get(object);
	};
})();