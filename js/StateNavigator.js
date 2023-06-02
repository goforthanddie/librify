const NUM_MAX_STATES = 10;

class StateNavigator {

	currentStateIdx;
	states;

	constructor() {
		this.states = [];
	}

	saveCurrentState(library) {
		// if NUM_MAX_STATES is reached we have to remove the first element of the states array before pushing a new one
		if(this.states.length >= NUM_MAX_STATES) {
			//console.log('shifting one state')
			this.states.shift();
		}
		//console.log(spotify.artists);
		this.currentStateIdx = this.states.push({
			artists: JSON.stringify(library.artists, Utils.replacerArtists),
			genres: JSON.stringify(library.genres, Utils.replacerGenres)
		}) - 1;

		this.updateControlElements();
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
					// todo: add reviverGenres but it is currently in Library.js
					genres: JSON.parse(this.states[this.currentStateIdx].genres)
				};
			}
		}
		return undefined;
	}

	undo() {
		if(this.currentStateIdx > 0) {
			this.currentStateIdx = this.currentStateIdx - 1;
			console.debug('currentStateIdx=' + this.currentStateIdx);
			let currentState = this.getCurrentState();
			if(currentState !== undefined) {
				localStorage.setItem('genres', currentState.genres);
				localStorage.setItem('artists', currentState.artists);
			}
			return true;
		} else {
			return false;
		}
	}

	redo() {
		if(this.currentStateIdx < this.states.length - 1) {
			this.currentStateIdx = this.currentStateIdx + 1;
			console.debug('currentStateIdx=' + this.currentStateIdx);
			let currentState = this.getCurrentState();
			if(currentState !== undefined) {
				localStorage.setItem('genres', currentState.genres);
				localStorage.setItem('artists', currentState.artists);
			}
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