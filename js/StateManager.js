const NUM_MAX_STATES = 10;

class StateManager {

	states;
	currentStateIdx;
	library;
	options;

	constructor(library, options) {
		this.states = [];

		if(library !== null && library !== undefined) {
			this.library = library;
		} else {
			console.debug('got no library object.');
		}

		if(options !== null && options !== undefined) {
			this.options = options;
		} else {
			console.debug('got no options object.');
		}
	}

	getCurrentState(serialized = true) {
		this.updateControlElements();
		if(this.states.length > 0 && this.currentStateIdx >= 0 && this.currentStateIdx <= this.states.length) {
			console.debug('returning this.states[' + this.currentStateIdx + ']');
			if(serialized) {
				return this.states[this.currentStateIdx];
			} else {
				return {
					artists: JSON.parse(this.states[this.currentStateIdx].artists, Utils.reviverArtists),
					genres: JSON.parse(this.states[this.currentStateIdx].genres, Utils.reviverGenres.bind(this.library)),
					options: JSON.parse(this.states[this.currentStateIdx].options, Utils.reviverOptions)
				};
			}
		}
		return undefined;
	}

	loadCurrentState() {
		console.debug('loadCurrentState() ' + this.currentStateIdx);
		let currentState = this.getCurrentState(false);
		if(currentState !== undefined) {
			this.library.genres = currentState.genres;
			this.library.artists = currentState.artists;
			this.options.view = currentState.options.view;
			this.options.sortAlbums = currentState.options.sortAlbums;
			this.library.notifyUpdateListeners(false);
		}
	}

	saveCurrentState() {
		console.debug('saveCurrentState()');
		let currentState = {
			artists: JSON.stringify(this.library.artists, Utils.replacerArtists),
			genres: JSON.stringify(this.library.genres, Utils.replacerGenres),
			options: JSON.stringify(this.options)
		};

		// remove all states after the current state if we are not in the last state
		// if we come from an undo() operation, we start a new branch of states after the current state
		if(this.currentStateIdx < this.states.length - 1) {
			console.debug('this.states.splice(' + this.currentStateIdx + ')');
			this.states.splice(this.currentStateIdx + 1);
		}


		// if NUM_MAX_STATES is reached we have to remove the first element of the states array before pushing a new one
		if(this.states.length >= NUM_MAX_STATES) {
			console.debug('shifting one state')
			this.states.shift();
		}
		//console.log(spotify.artists);
		this.currentStateIdx = this.states.push(currentState) - 1;
		this.updateControlElements();
	}

	loadFromFile(file) {
		console.debug('loadFromFile()');
		let fr = new FileReader();
		fr.onload = function receivedText() {
			let data = JSON.parse(fr.result);
			if(data.artists !== null !== undefined) {
				this.library.artists = JSON.parse(JSON.stringify(data.artists), Utils.reviverArtists);
			} else {
				console.debug('data.artists === null');
			}
			if(data.genres !== null !== undefined) {
				this.library.genres = JSON.parse(JSON.stringify(data.genres), Utils.reviverGenres.bind(this.library));
			} else {
				console.debug('data.genres === null');
			}

			if(data.options !== null && data.options !== undefined) {
				// do not directly set this.options = JSON.parse(options, Utils.reviverOptions); this generates a new object and then there are two differing Options objects in spotify and library
				let tmpOptions = JSON.parse(JSON.stringify(data.options), Utils.reviverOptions);
				this.options.view = tmpOptions.view;
				this.options.sortAlbums = tmpOptions.sortAlbums;
			} else {
				console.debug('data.options === null');
			}
			this.library.notifyUpdateListeners();
		}.bind(this);
		fr.readAsText(file);
	}

	loadFromLocalStorage(saveCurrentState = true) {
		console.debug('loadFromLocalStorage()');
		let artists = localStorage.getItem('artists');
		if(artists != null) {
			this.library.artists = JSON.parse(artists, Utils.reviverArtists);
		} else {
			this.library.artists = [];
		}

		// must parse artists before genres. artists in genres are only identified by an id and retrieved during the revive process.
		let genres = localStorage.getItem('genres');
		if(genres != null) {
			this.library.genres = JSON.parse(genres, Utils.reviverGenres.bind(this.library));
		} else {
			// add the default genre so all artists without a genre other than the default genre will end up in this genre
			//this.library.genres = [GENRE_DEFAULT]; // das hier beim einlesen machen!
			this.library.genres = []; // the default genre is added in getGenres()
		}

		let options = localStorage.getItem('options');
		if(options != null) {
			// do not directly set this.options = JSON.parse(options, Utils.reviverOptions); this generates a new object and then there are two differing Options objects in spotify and library
			let tmpOptions = JSON.parse(options, Utils.reviverOptions);
			this.options.view = tmpOptions.view;
			this.options.sortAlbums = tmpOptions.sortAlbums;
		} else {
			this.options.sortAlbums = SORT_BY_YEAR;
			this.options.view = VIEW_GENRE;
		}

		this.library.notifyUpdateListeners(saveCurrentState);
	}

	saveToLocalStorage(saveCurrentState = true) {
		console.debug('saveToLocalStorage()');
		// sort genres alphabetically
		this.library.genres.sort((a, b) => a.name.localeCompare(b.name));

		// sort artists in genres alphabetically
		this.library.genres.forEach(_genre => _genre.sortArtists());

		localStorage.removeItem('genres');
		localStorage.setItem('genres', JSON.stringify(this.library.genres, Utils.replacerGenres));

		// sort artists alphabetically
		this.library.artists.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('artists');
		localStorage.setItem('artists', JSON.stringify(this.library.artists, Utils.replacerArtists));

		localStorage.removeItem('options');
		localStorage.setItem('options', JSON.stringify(this.options));

		if(saveCurrentState) {
			this.saveCurrentState();
		}
	}

	undo() {
		console.debug('undo()');
		if(this.currentStateIdx > 0) {
			this.currentStateIdx = this.currentStateIdx - 1;
			this.loadCurrentState();
			return true;
		} else {
			return false;
		}
	}

	redo() {
		console.debug('redo()');
		if(this.currentStateIdx < this.states.length - 1) {
			this.currentStateIdx = this.currentStateIdx + 1;
			this.loadCurrentState();
			return true;
		} else {
			return false;
		}
	}

	updateControlElements() {
		console.debug('updateControlElements()');
		if(this.currentStateIdx >= 0 && this.currentStateIdx < this.states.length - 1) {
			$('#buttonRedo').attr('disabled', false);
		} else {
			$('#buttonRedo').attr('disabled', true);
		}

		if(this.currentStateIdx > 0) {
			$('#buttonUndo').attr('disabled', false);
		} else {
			$('#buttonUndo').attr('disabled', true);
		}
	}
}