class Genre {

	dataType = Genre.name;

	id;
	name;
	artists;

	constructor(name) {
		// todo: generate unique id
		this.id = name.replace(/\s/g,'').replace(/&/g, '').replace(/\'/g, '');
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