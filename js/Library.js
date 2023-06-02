class Library {

	artists;
	genres;
	updateListeners;
	stateNavigator;

	constructor() {
		this.updateListeners = [];
		this.stateNavigator = new StateNavigator();
		this.readFromLocalStorage();
	}

	addUpdateListener(listener) {
		this.updateListeners.push(listener);
	}

	notifyUpdateListeners() {
		console.debug('notifyUpdateListeners()');
		for(let i = 0, I = this.updateListeners.length; i < I; i++) {
			this.updateListeners[i]();
		}
	}

	readFromLocalStorage(saveCurrentState = true) {
		let artists = localStorage.getItem('artists');
		if(artists != null) {
			this.artists = JSON.parse(artists, Utils.reviverArtists);
		} else {
			this.artists = [];
		}

		// must parse artists before genres. artists in genres are only identified by an id and retrieved during the revive process.
		let genres = localStorage.getItem('genres');
		if(genres != null) {
			this.genres = JSON.parse(genres, this.reviverGenres);
		} else {
			// add the default genre so all artists without a genre other than the default genre will end up in this genre
			this.genres = [GENRE_DEFAULT]; // das hier beim einlesen machen!
		}

		if(saveCurrentState) {
			this.stateNavigator.saveCurrentState(this);
		}

		this.notifyUpdateListeners();
	}

	saveToLocalStorage(saveCurrentState = true) {
		// sort genres alphabetically
		this.genres.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('genres');
		localStorage.setItem('genres', JSON.stringify(this.genres, Utils.replacerGenres));

		// sort artists alphabetically
		this.artists.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('artists');
		localStorage.setItem('artists', JSON.stringify(this.artists, Utils.replacerArtists));

		if(saveCurrentState) {
			this.stateNavigator.saveCurrentState(this);
		}

		this.notifyUpdateListeners();
	}

	emptyArtists() {
		localStorage.removeItem('artists');
		this.artists = [];
	}

	removeEmptyGenres() {
		let oldLength = this.genres.length;
		this.genres = this.genres.filter(_genre => _genre.artists.length > 0);
		this.saveToLocalStorage();

		return oldLength - this.genres.length;
	}

	// custom reviver to parse the stringified genres back into objects
	reviverGenres = (function(key, value) {
		//console.log(this);
		let artist;
		if(typeof value === 'object' && value !== null) {
			if(value.dataType === Artist.name) {
				artist = this.artists.find(element => element.id === value.id);
				return artist;
			} else if(value.dataType === Genre.name) {
				let genre = new Genre(value.name);
				value.artists.forEach(_artist => {
					artist = JSON.parse(JSON.stringify(_artist), Utils.reviverArtists);
					genre.addArtist(artist);
				});
				return genre;
			}
		}
		return value;
	}).bind(this); // bind the context to the reviver so that this.artists can be accessed

	reduceGenres() {
		// this function reduces the amount of genres by going through each artist's spotify genres and keeping only the genre with the most occurrences within the library
		let reducedGenres = [];
		this.artists.forEach(_artist => {
			//console.log('_artist=' + _artist.name);
			//console.log(_artist);
			let maxArtistsGenre = 0;
			let maxArtistsGenreIdx;

			_artist.getGenres(this.genres);

			// _artist.genres should be empty after a first reduceGenres() call -> _artist.getGenres reads the genres from library.genres so it is not empty.
			//_artist.genres.forEach(_genre => {
			// we only need to do this if the artist has more than one genre
			if(_artist.genres.length > 1) {
				_artist.genres.forEach(_genre => {
					console.debug('_genre=' + _genre);
					// find genre with most entries
					let genreIdx = this.genres.findIndex(element => element.name === _genre);
					//console.log('genreIdx='+genreIdx);
					if(genreIdx !== -1) {
						//console.log('maxArtistsGenre=' + maxArtistsGenre);
						console.debug('this.genres[genreIdx].artists.length=' + this.genres[genreIdx].artists.length);
						let numArtists = this.genres[genreIdx].artists.length;
						if(numArtists > maxArtistsGenre) {
							maxArtistsGenre = numArtists;
							maxArtistsGenreIdx = genreIdx;
						} else {
							console.debug('else');
						}
						//console.log('maxArtistsGenre='+maxArtistsGenre);
					} else {
						console.debug(_genre.name + ' not found in this.genres :O');
					}
				});
				// if an artist has no associated genres maxArtistsGenreIdx === undefined
				if(maxArtistsGenreIdx !== undefined) {
					console.debug(maxArtistsGenreIdx);
					console.debug('_genre mit meisten artists:' + this.genres[maxArtistsGenreIdx].name);

					// remove artist from genres with less artists than the main genre
					_artist.genres.forEach(_genre => {
						let genreIdx = this.genres.findIndex(element => element.name === _genre);
						if(genreIdx !== -1 && genreIdx !== maxArtistsGenreIdx) {
							this.genres[genreIdx].artists = this.genres[genreIdx].artists.filter(function(__artist) {
								//console.log('__artist.id=' + __artist.id + '!=' + '_artist.id=' + _artist.id);
								return (__artist.id !== _artist.id)
							});
						}
					});

					// remove genres from artist to save memory
					_artist.genres = [];

					// test if genre is not already in the new array
					if(reducedGenres.findIndex(element => element.id === this.genres[maxArtistsGenreIdx].id) === -1) {
						console.debug('pushing ' + this.genres[maxArtistsGenreIdx].name)
						console.debug(this.genres[maxArtistsGenreIdx]);
						reducedGenres.push(this.genres[maxArtistsGenreIdx]);
					}
				} else {
					console.log(_artist);
				}
			}
		});
		console.debug(reducedGenres);

		// in case the function is called a second time reducedGenres will be empty and thus clean the db
		let oldLength = this.genres.length;
		let numReduced = 0;
		if(reducedGenres.length > 0) {
			this.genres = reducedGenres;
			this.saveToLocalStorage();
			numReduced = oldLength - reducedGenres.length;
		} else {
			console.log('reduceGenres() has delivered no change.');
		}

		return numReduced;
	}

	reduceGenresFurther() {
		console.debug('reduceGenresFurther()');
		let foundMainGenres = [];
		let foundSubGenres = [];
		console.log(this.genres);
		// identify sub genres, i.e., genres where the name of another genre is part of the name
		this.genres.forEach(_genre => {
			let subGenres = this.genres.filter(element => element.name.includes(_genre.name) && element.id !== _genre.id);
			// test for length > 1 because it will always find itself
			if(subGenres.length > 0) {
				subGenres.forEach(_subgenre => {
					console.log('subgenre ' + _subgenre.name);
					// add all the artists of the found sub genres to the main genre
					_subgenre.artists.forEach(_artist => {
						_genre.addArtist(_artist);
					});

					//_genre.addSubGenre(_subgenre);
					// test if the sub genre is already in the foundSubGenres array, if not, add it
					if(foundSubGenres.findIndex(element => element.id === _subgenre.id) === -1) {
						foundSubGenres.push(_subgenre);
					}
				});
			}
		});
		// identify main genres, i.e., genres that are not sub genres
		this.genres.forEach(_genre => {
			if(foundSubGenres.findIndex(element => element.id === _genre.id) === -1) {
				// test if the main genre is already in the foundMainGenres array, if not, add it
				if(foundMainGenres.findIndex(element => element.id === _genre.id) === -1) {
					foundMainGenres.push(_genre);
				}
			}
		});
		console.log(foundMainGenres);
		console.log(foundSubGenres);
		foundMainGenres.forEach(_genre => {
			_genre.artists.sort((a, b) => a.name.localeCompare(b.name));
		});
		this.genres = foundMainGenres;

		// test if we still got all the artists
		/*
		let compArtists = [];
		this.genres.forEach(_genre => {
			_genre.artists.forEach(_artist => {
				if(compArtists.findIndex(element => element.id === _artist.id) === -1) {
					compArtists.push(_artist)
				}
			})
		});
		console.log('compArtists.length=' + compArtists.length);*/
		//console.log(compArtists.sort((a, b) => a.name.localeCompare(b.name)));
		/*
				this.storeGenres();
				this.populateViewLibrary();*/
		this.saveToLocalStorage();
	}
	
	clusterGenres() {
		console.debug('clusterGenres()');
		let oldLength = this.genres.length;
		let selectGenreMain = $('select#genreMain');
		let genreMain = this.genres.find(element => element.id === selectGenreMain.val());
		//console.log(genreMain);
		if(genreMain !== undefined) {
			//console.log(selectGenreSub.children(':selected'));
			// add all the artists of the found sub genres to the main genre
			let selectGenreSub = $('select#genresSub');
			selectGenreSub.val().forEach(_idGenreSub => {
				//console.log(_idGenreSub);
				let genreSubIdx = this.genres.findIndex(element => element.id === _idGenreSub);
				//console.log(this.library.genres[genreSubIdx]);
				if(genreSubIdx !== -1) {
					this.genres[genreSubIdx].artists.forEach(_artist => {
						genreMain.addArtist(_artist);
					});
					//genreMain.addSubGenre(this.library.genres[genreSubIdx]);

					// remove sub genre from main array
					this.genres.splice(genreSubIdx, 1);
				}
			});

			$('input#genresSubKeyword').val('');

			// sort artists in genres
			genreMain.artists.sort((a, b) => a.name.localeCompare(b.name));

			// store new genres
			this.saveToLocalStorage();
		}
		return oldLength - this.genres.length;
	}

	addGenreByName(genreName) {
		if(genreName.length > 0 && this.genres.find(element => element.name === genreName) === undefined) {
			let genre = new Genre(genreName);
			this.genres.push(genre);
			this.saveToLocalStorage();
			return true
		} else {
			return false;
		}
	}
}
