class Genre {

	dataType = Genre.name;

	id;
	name;
	artists;
	//subGenres;

	constructor(name) {
		// todo: generate unique id
		this.id = name.replace(/\s/g,'').replace(/&/g, '').replace(/\'/g, '');
		this.name = name;
		this.artists = [];
		//this.subGenres = [];
	}

	addArtist(artist) {
		// add only if artist id ist not yet existing
		if(this.artists.find(element => element.id === artist.id) === undefined) {
			this.artists.push(artist);
		}
	}

	/*addSubGenre(subGenre) {
		// add only if artist id ist not yet existing
		if(this.subGenres.find(element => element.id === subGenre.id) === undefined) {
			this.subGenres.push(subGenre);
		}
	}*/
}

const GENRE_DEFAULT = new Genre('None');