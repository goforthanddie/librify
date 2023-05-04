class Artist {

	dataType = Artist.name;

	id;
	name;
	albums;
	genres;

	constructor(id, name) {
		this.id = id;
		this.name = name;
		this.albums = [];
		// add default genre where the artist gets listed even if spotify does not return any genre
		this.genres = [GENRE_DEFAULT.name];
	}

	addAlbum(album) {
		// add only if album id ist not yet existing
		if(this.albums.find(element => element.id === album.id) === undefined) {
			this.albums.push(album);
		}
	}
}