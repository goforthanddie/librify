class Genre extends TreeNode {

	dataType = Genre.name;

	artists;

	//subGenres;

	constructor(name) {
		// todo: generate unique id
		let id = name.replace(/\s/g,'').replace(/&/g, '').replace(/\'/g, '');
		super(id, name);
		this.artists = [];
		//this.subGenres = [];
	}

	addArtist(artist) {
		// add only if artist id ist not yet existing
		if(this.artists.find(element => element.id === artist.id) === undefined) {
			//console.debug('genre.name=' + this.name + ' addArtist(artist=' + artist.name + ')');
			this.artists.push(artist);
		}
	}

	sortArtists() {
		this.artists.sort((a, b) => a.name.localeCompare(b.name));
	}

	/*addSubGenre(subGenre) {
		// add only if artist id ist not yet existing
		if(this.subGenres.find(element => element.id === subGenre.id) === undefined) {
			this.subGenres.push(subGenre);
		}
	}*/
}

const GENRE_DEFAULT = new Genre('None');