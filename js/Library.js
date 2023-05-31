class Library {

	artists;
	genres;
	updateListener;

	constructor() {
		this.updateListener = [];
		this.readFromLocalStorage();
	}

	addUpdateListener(listener) {
		this.updateListener.push(listener);
	}

	notifyUpdateListeners() {
		for(let i = 0, I = this.updateListener.length; i < I; i++) {
			this.updateListener[i]();
		}
	}

	readFromLocalStorage() {
		let artists = localStorage.getItem('artists');
		if(artists != null) {
			this.artists = JSON.parse(artists, Utils.reviverArtists);
			console.log('retrieved ' + this.artists.length + ' artists');
		} else {
			this.artists = [];
		}

		// must parse artists before genres. artists in genres are only identified by an id and retrieved during the revive process.
		let genres = localStorage.getItem('genres');
		if(genres != null) {
			this.genres = JSON.parse(genres, this.reviverGenres);
		} else {
			// add the default genre so all artists without a genre other than the default genre will end up in this genre
			this.genres = [GENRE_DEFAULT]; // das hier beim einlesen machen!
		}

		this.notifyUpdateListeners();
	}

	saveToLocalStorage() {
		// sort genres alphabetically
		this.genres.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('genres');
		localStorage.setItem('genres', JSON.stringify(this.genres, Utils.replacerGenres));


		// could use some sort of genreUpdateListener here
		/*
		if($('#viewManageGenres').is(':visible')) {
			console.log('viewManageGenres is visible')
			this.reduceGenresManually();
		}*/

		// sort artists alphabetically
		this.artists.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('artists');
		// todo: remove genres from artists when storing, write replacer
		localStorage.setItem('artists', JSON.stringify(this.artists, Utils.replacerArtists));

		this.notifyUpdateListeners();
	}

	emptyArtists() {
		localStorage.removeItem('artists');
		this.artists = [];
	}

	removeEmptyGenres() {
		this.genres = this.genres.filter(_genre => _genre.artists.length > 0);
		this.saveToLocalStorage();
	}

	// custom reviver to parse the stringified genres back into objects
	reviverGenres = (function(key, value) {
		//console.log(this);
		let artist;
		if(typeof value === 'object' && value !== null) {
			if(value.dataType === Artist.name) {
				artist = this.artists.find(element => element.id === value.id);
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
	}).bind(this); // bind the context to the reviver so that this.artists can be accessed


}
