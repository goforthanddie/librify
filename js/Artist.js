class Artist extends TreeNode {

	dataType = Artist.name;

	albums;
	genres;

	constructor(id, name) {
		super(id, name);
		this.albums = [];
		// add default genre where the artist gets listed even if spotify does not return any genre
		//this.genres = [GENRE_DEFAULT.name]; not necessary, getGenres sets the default genre if necessary.
		this.genres = [];
	}

	addAlbum(album) {
		// add only if album id ist not yet existing
		if(this.albums.find(element => element.id === album.id) === undefined) {
			this.albums.push(album);
		}
	}

	addGenre(genreName) {
		// add only if artist id ist not yet existing
		// todo: überlegen ob hier doch nur objekte eingefügt werden, dafür müsste das von spotify kommende array sofort umgewandelt werden
		if(this.genres.find(element => element === genreName) === undefined) {
			this.genres.push(genreName);
		}
	}

	// usages could be slow, check alternatives if necessary
	getGenres(genresArray) {
		if(genresArray !== null && genresArray !== undefined) {
			let genres = genresArray.filter(_genre => _genre.children.find(_artist => _artist.id === this.id) !== undefined);
			for(let i = 0, I = genres.length; i < I; i++) {
				//console.debug('adding ' + genres[i].name);
				this.addGenre(genres[i].name);
			}
			return this.genres;
		} else {
			console.debug('getGenres() genresArray empty');
			return false;
		}

	}
}