const NUM_MAX_STATES = 10;

class StateManager {

	states;
	currentStateIdx;
	library;

	constructor(library) {
		this.states = [];

		if(library !== null) {
			this.library = library;
		} else {
			console.debug('got no library object... using empty Library object.');
			this.library = new Library();
		}

		// if we initially load saved data we only want to call saveCurrentState() once, so we have to do it manually here
		this.loadFromLocalStorage(false);
		this.saveCurrentState();
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
		console.debug('currentStateIdx=' + this.currentStateIdx);
		let currentState = this.getCurrentState(false);
		if(currentState !== undefined) {
			this.library.genres = currentState.genres;
			this.library.artists = currentState.artists;
			this.library.options = currentState.options;
			this.library.notifyUpdateListeners(false);
		}
	}

	saveCurrentState() {
		console.debug('saveCurrentState()');

		let currentState = {
			artists: JSON.stringify(this.library.artists, Utils.replacerArtists),
			genres: JSON.stringify(this.library.genres, Utils.replacerGenres),
			options: JSON.stringify(this.library.options)
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
		let fr = new FileReader();
		fr.onload = function receivedText() {
			let data = JSON.parse(fr.result);
			if(data.artists !== null) {
				this.artists = JSON.parse(JSON.stringify(data.artists), Utils.reviverArtists);
			} else {
				console.debug('data.artists === null');
			}
			if(data.genres !== null) {
				this.genres = JSON.parse(JSON.stringify(data.genres), Utils.reviverGenres.bind(this));
			} else {
				console.debug('data.genres === null');
			}

			if(data.options !== null) {
				this.options = JSON.parse(JSON.stringify(data.options), Utils.reviverOptions);
			} else {
				console.debug('data.options === null');
			}
			this.notifyUpdateListeners();
		}.bind(this.library);
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
			this.library.genres = [GENRE_DEFAULT]; // das hier beim einlesen machen!
		}

		let options = localStorage.getItem('options');
		if(options != null) {
			// do not directly set this.library.options = JSON.parse(options, Utils.reviverOptions); this generates a new object and then there are two differing Options objects in spotify and library
			let tmpOptions = JSON.parse(options, Utils.reviverOptions);
			this.library.options.view = tmpOptions.view;
			this.library.options.sortAlbums = tmpOptions.sortAlbums;

		} else {
			//this.library.options = new Options();
			this.library.options.sortAlbums = SORT_BY_YEAR;
			this.library.options.view = VIEW_GENRE;
		}

		if(saveCurrentState) {
			this.saveCurrentState();
		}

		this.library.notifyUpdateListeners(saveCurrentState);
	}

	saveToLocalStorage(saveCurrentState = true) {
		// sort genres alphabetically
		this.library.genres.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('genres');
		localStorage.setItem('genres', JSON.stringify(this.library.genres, Utils.replacerGenres));

		// sort artists alphabetically
		this.library.artists.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('artists');
		localStorage.setItem('artists', JSON.stringify(this.library.artists, Utils.replacerArtists));

		console.log(this.library.options);
		localStorage.removeItem('options');
		localStorage.setItem('options', JSON.stringify(this.library.options));

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