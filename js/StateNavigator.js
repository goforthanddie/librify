const NUM_MAX_STATES = 10;

class StateNavigator {

	currentStateIdx;
	states;

	constructor() {
		this.states = [];
	}

	saveCurrentState(spotify) {
		// if NUM_MAX_STATES is reached we have to remove the first element of the states array before pushing a new one
		if(this.states.length >= NUM_MAX_STATES) {
			//console.log('shifting one state')
			this.states.shift();
		}
		//console.log(spotify.artists);
		this.currentStateIdx = this.states.push({
			artists: JSON.stringify(spotify.artists),
			genres: JSON.stringify(spotify.genres, Utils.replacerGenres)
		}) - 1;

		this.updateControlElements();
	}

	getCurrentState() {
		this.updateControlElements();
		if(this.states.length > 0 && this.currentStateIdx >= 0 && this.currentStateIdx <= this.states.length) {
			console.debug('returning this.states[' + this.currentStateIdx + ']');
			return this.states[this.currentStateIdx];
		}
		return undefined;
	}

	undo() {
		this.currentStateIdx = this.currentStateIdx - 1;
		console.debug('currentStateIdx=' + this.currentStateIdx);
		return this.getCurrentState();
	}

	redo() {
		this.currentStateIdx = this.currentStateIdx + 1;
		console.debug('currentStateIdx=' + this.currentStateIdx);
		return this.getCurrentState();
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