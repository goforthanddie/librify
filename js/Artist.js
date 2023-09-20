class Artist extends TreeNode {

	dataType = Artist.name;

	constructor(id, name) {
		super(id, name);
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
			let genres = genresArray.filter(_genre => _genre.children.find(_artist => _artist instanceof Artist && _artist.id === this.id) !== undefined);
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