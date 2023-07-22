class Library {

	artists;
	genres;
	tree;
	updateListeners;

	constructor() {
		this.artists = [];
		this.genres = [];
		this.treeFlat = [];
		this.updateListeners = [];
	}

	addUpdateListener(listener) {
		this.updateListeners.push(listener);
	}

	// if the call is from redo() or undo() we do not want to call saveCurrentState(), got no better idea than that right now.
	// todo: improve D:
	notifyUpdateListeners(saveCurrentState = true) {
		console.debug('notifyUpdateListeners()');
		// todo: tree sollte eigentlich initialisiert werden dann ist der check vllt überflüssig
		if(this.tree !== undefined) {
			this.treeFlat = TreeNode.getAllChildren(this.tree);
		}
		for(let i = 0, I = this.updateListeners.length; i < I; i++) {
			//console.debug(this.updateListeners[i]);
			this.updateListeners[i].call(null, saveCurrentState);
		}
	}

	emptyArtists() {
		console.debug('emptyArtists()');
		localStorage.removeItem('artists');
		this.artists = [];
		// this is only called during library updates, so we won't call this.notifyUpdateListeners(); if it would be called, the library empties and we do not have any information about expanded genres, artists and so on
	}

	removeEmptyGenres() {
		console.debug('removeEmptyGenres()');
		let oldLength = this.genres.length;
		this.genres = this.genres.filter(_genre => _genre.artists.length > 0);
		this.notifyUpdateListeners();

		return oldLength - this.genres.length;
	}

	moveArtistToGenre(newGenre, oldGenreId, artistId) {
		console.debug('moveArtistToGenre()');
		let artist;
		if(newGenre !== undefined) {
			//console.log('moving to ' + genreMain.id);
			// aus gedraggtem genre entfernen.
			let oldGenreIdx = this.genres.findIndex(element => element.id === oldGenreId);
			if(oldGenreIdx !== -1) {
				let artistIdx = this.genres[oldGenreIdx].artists.findIndex(element => element.id === artistId);
				if(artistIdx !== -1) {
					// add artist to newGenre
					artist = this.genres[oldGenreIdx].artists[artistIdx];
					newGenre.addArtist(artist);
					// remove artist from oldGenre
					this.genres[oldGenreIdx].artists.splice(artistIdx, 1);
				}
			// if for some reason there is no match for the oldGenreId, we look for the artist in the this.artist array
			} else {
				artist = this.artists.find(element => element.id === artistId);
				if(artist !== undefined) {
					newGenre.addArtist(artist);
				}
			}

			this.notifyUpdateListeners();
			return {status: true, artistName: artist.name};
		}
		return {status: false, artistName: null};
	}

	moveArtistsFromGenreToGenre(newGenre, oldGenreId) {
		console.debug('moveArtistsFromGenreToGenre()');
		// need the genre index to remove the item from the this.genres array
		let oldGenreIdx = this.genres.findIndex(element => element.id === oldGenreId);

		//console.log(this.library.genres[oldGenreIdx]);
		if(newGenre !== undefined && oldGenreIdx !== -1 && newGenre.id !== oldGenreId) {
			let oldGenre = this.genres[oldGenreIdx];

			// add artists from oldGenre to newGenre
			oldGenre.artists.forEach(_artist => {
				newGenre.addArtist(_artist);
			});

			// remove oldGenre from this.genres
			this.genres.splice(oldGenreIdx, 1);

			this.notifyUpdateListeners();
			return {status: true, oldGenreName: oldGenre.name};
		}
		return {status: false, oldGenreName: null};
	}

	reduceGenres() {
		console.debug('reduceGenres()');
		// this function reduces the amount of genres by going through each artist's spotify genres and keeping only the genre with the most occurrences within the library
		let reducedGenres = [];
		this.artists.forEach(_artist => {
			console.debug('_artist=' + _artist.name);
			//console.log(_artist);
			let maxArtistsGenre = 0;
			let maxArtistsGenreIdx;

			_artist.getGenres(this.genres);

			// _artist.genres should be empty after a first reduceGenres() call -> _artist.getGenres reads the genres from library.genres so it is not empty.
			//_artist.genres.forEach(_genre => {
			// we only need to do this if the artist has more than one genre
			if(_artist.genres.length > 0) {
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
		//console.debug(reducedGenres);

		// in case the function is called a second time reducedGenres will be empty and thus clean the db
		let oldLength = this.genres.length;
		let numReduced = 0;
		if(reducedGenres.length > 0) {
			this.genres = reducedGenres;
			this.notifyUpdateListeners();
			//this.saveToLocalStorage();
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
			_genre.sortArtists();
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
		//this.saveToLocalStorage();
		this.notifyUpdateListeners();
	}

	clusterGenres() {
		console.debug('clusterGenres()');
		let oldLength = this.genres.length;
		let selectGenreMain = $('select#genreMain');
		let genreMain = this.genres.find(element => element.id === selectGenreMain.val());
		//console.log(genreMain);
		if(genreMain !== undefined) {
			//console.log(selectGenreSub.children(':selected'));
			// add all the artists of the found subgenres to the main genre
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

					// remove subgenre from main array
					this.genres.splice(genreSubIdx, 1);
				}
			});

			$('input#genresSubKeyword').val('');

			this.notifyUpdateListeners();
		}
		return oldLength - this.genres.length;
	}

	addGenreByName(genreName) {
		if(genreName.length > 0 && this.genres.find(element => element.name === genreName) === undefined) {
			let genre = new Genre(genreName);
			this.genres.push(genre);
			this.notifyUpdateListeners();
			return true
		} else {
			return false;
		}
	}

	// getNumAlbums() returns the number of unique albums in the library
	getNumAlbums() {
		let albums = [];
		for(let i = 0, I = this.artists.length; i < I; i++) {
			let _albums = this.artists[i].albums;
			for(let j = 0, J = _albums.length; j < J; j++) {
				let album = _albums[j];
				if(albums.find(element => element === album.id) === undefined) {
					albums.push(album.id);
				}
			}
		}
		return albums.length;
	}

	getNumAlbumsNonUnique() {
		let count = 0;
		for(let i = 0, I = this.artists.length; i < I; i++) {
			count = count + this.artists[i].albums.length;
		}
		return count;
	}

	getCount() {
		let count = 0;
		for(let i = 0, I = this.genres.length; i < I; i++) {
			count++;
			for(let j = 0, J = this.genres[i].artists.length; j < J; j++) {
				count++;
				for(let k = 0, K = this.genres[i].artists[j].albums.length; k < K; k++) {
					count++;
				}
			}
		}
		return count;
	}
}
