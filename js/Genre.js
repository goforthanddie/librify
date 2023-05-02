class Genre {

	dataType = Genre.name;

	name;
	artists;

	constructor(name) {
		this.name = name;
		this.artists = [];
	}

	addArtist(artist) {
		// add only if artist id ist not yet existing
		if(this.artists.find(element => element.id === artist.id) === undefined) {
			this.artists.push(artist);
		}
	}
}

const GENRE_DEFAULT = new Genre('None');