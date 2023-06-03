const NUM_MAX_STATES = 10;

class StateNavigator {

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
					genres: JSON.parse(this.states[this.currentStateIdx].genres, Utils.reviverGenres.bind(this))
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
			this.library.notifyUpdateListeners(false);
		}
	}

	saveCurrentState() {
		console.debug('saveCurrentState()');

		let currentState = {
			artists: JSON.stringify(this.library.artists, Utils.replacerArtists),
			genres: JSON.stringify(this.library.genres, Utils.replacerGenres)
		};

		// if NUM_MAX_STATES is reached we have to remove the first element of the states array before pushing a new one
		if(this.states.length >= NUM_MAX_STATES) {
			//console.log('shifting one state')
			this.states.shift();
		}
		//console.log(spotify.artists);
		this.currentStateIdx = this.states.push(currentState) - 1;

		this.updateControlElements();
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
			console.debug('pre()');
			this.library.genres = JSON.parse(genres, Utils.reviverGenres.bind(this));
		} else {
			// add the default genre so all artists without a genre other than the default genre will end up in this genre
			this.library.genres = [GENRE_DEFAULT]; // das hier beim einlesen machen!
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