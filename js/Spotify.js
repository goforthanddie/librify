const clientId = 'f77bc91de5834f398680d65c02bdfe94';
//const redirectUri = 'https://librify.coderbutze.de';
const redirectUri = 'http://localhost:63342/SpotifyTree/index.html';

const URL_AUTH = 'https://accounts.spotify.com/api/token';

class Spotify {


	//stateNavigator;
	library;
	//artists;
	options;
	//genres;
	accessToken;
	arrayDevices;

	dragged;

	constructor() {
		this.options = new Options();
		//this.stateNavigator = new StateNavigator();
		this.accessToken = null;
		this.library = new Library();
		this.library.addUpdateListener(this.reduceGenresManually.bind(this));
		this.library.addUpdateListener(this.populateViewLibrary.bind(this));

		//this.readFromLocalStorage();
		this.arrayDevices = [];
	}

	/*
	readFromLocalStorage() {
		let artists = localStorage.getItem('artists');
		if(artists != null) {
			this.library.artists = JSON.parse(artists, Utils.reviverArtists);
			console.log('retrieved ' + this.library.artists.length + ' artists');
		} else {
			this.library.artists = [];
		}

		// must parse artists before genres. artists in genres are only identified by an id and retrieved during the revive process.
		let genres = localStorage.getItem('genres');
		if(genres != null) {
			this.library.genres = JSON.parse(genres, this.reviverGenres);
		} else {
			// add the default genre so all artists without a genre other than the default genre will end up in this genre
			this.library.genres = [GENRE_DEFAULT]; // das hier beim einlesen machen!
		}
	}

	// custom reviver to parse the stringified genres back into objects
	reviverGenres = (function(key, value) {
		//console.log(this);
		let artist;
		if(typeof value === 'object' && value !== null) {
			if(value.dataType === Artist.name) {
				artist = this.library.artists.find(element => element.id === value.id);
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
	}).bind(this); // bind the context to the reviver so that this.library.artists can be accessed
*/

	async sendRequest(url, type, data, fnSuccess, fnError, counter = 1) {
		console.debug('sendRequest()');
		if(url === undefined || url === null) console.error('parameter url undefined or null');
		if(type === undefined || type === null) console.error('parameter type undefined or null');
		if(data === undefined || data === null) console.error('parameter data undefined or null');
		if(fnSuccess === undefined || fnSuccess === null) console.error('parameter fnSuccess undefined or null');
		if(fnError === undefined || fnError === null) {
			console.debug('parameter fnError undefined or null');
			fnError = function() {
			};
		}

		$.ajax({
			url: url,
			type: type,
			context: this,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': (this.accessToken !== null && url !== URL_AUTH) ? this.accessToken.type + '  ' + this.accessToken.token : ''
			},
			statusCode: {
				// 401: Unauthorized - The request requires user authentication or, if the request included authorization credentials, authorization has been refused for those credentials.
				401: function() {
					console.log('Got 401. Refreshing the token.');
					let refreshToken = localStorage.getItem('refresh_token');
					this.refreshAccessToken(refreshToken, () => {
						// fire request again but maximum of 5 times
						console.log('counter=' + counter);
						if(counter < 5) {
							console.log('retry number ' + counter);
							this.sendRequest(url, type, data, fnSuccess, fnError, ++counter);
						}
					});
				},
				// 429: Rate limit reached
				429: async function(d) {
					console.debug('rate limit reached');
					console.debug('retry-after: ' + d.getResponseHeader('retry-after'));

					let retryAfter = parseInt(d.getResponseHeader('retry-after'));
					await new Promise(r => setTimeout(r, retryAfter * 1000));
					// fire request again but maximum of 5 times
					console.log('counter=' + counter);
					if(counter < 5) {
						console.log('retry number ' + counter);
						this.sendRequest(url, type, data, fnSuccess, fnError, ++counter);
					}
				}
			},
			data: data,
			success: function(_data) {
				fnSuccess.apply(this, [_data]);
			},
			error: function(_data) {
				fnError.apply(this, [_data]);
			}
		});
	}

	/*
	getSavedAlbums() gets the user's stored albums from spotify and updates the this.library.artists array if necessary in a subsequent call
	this function does not remove albums from the library that have been removed through spotify
	*/
	getSavedAlbums(offset = 0, limit = 50) {
		console.debug('getSavedAlbums(' + offset + ',' + limit + ')');

		// if this.library.genres and this.library.artists are already defined, we make an update call on getGenres

		let update = (this.library.genres.length > 1 && this.library.artists.length > 0);
		console.debug('update=' + update);

		// only echo stats on first call
		if(update && offset === 0) {
			console.debug('getSavedAlbums() update call, previous num of artists=' + this.library.artists.length + ', previous num of albums=' + this.library.artists.reduce((numAlbums, _artist) => numAlbums + _artist.albums.length, 0))
			console.debug(this.library.artists);
		}

		// empty array on first call, also on update
		if(offset === 0) {
			localStorage.removeItem('artists');
			this.library.artists = [];
			this.library.emptyArtists();
		}

		let url = 'https://api.spotify.com/v1/me/albums';
		let type = 'GET';
		let data = {
			'limit': limit,
			'offset': offset
		};
		let fnSuccess = function(data) {
			//console.log(data);
			// iterate over returned albums
			//console.debug('got ' + data.items.length + ' items');
			data.items.forEach(item => {
				//console.log(item.album);
				let album = new Album(item.album.id, item.album.name, item.album.release_date, item.album.release_date_precision);
				//console.log(album);
				// iterate over artists of album
				item.album.artists.forEach(_artist => {
					// test if artist is already in list
					let artistIdx = this.library.artists.findIndex(element => element.id === _artist.id);
					if(artistIdx === -1) { // artist id not found, add new artist
						let artist = new Artist(_artist.id, _artist.name);
						//artist.genres = this.getGenres(_artist.id);
						artist.addAlbum(album);
						this.library.artists.push(artist);
					} else { // artist id found, add album to existing artist
						//console.log(this.library.artists[idArtist]);
						this.library.artists[artistIdx].addAlbum(album);
					}
				});
			});

			console.log(Math.min(offset + limit, data.total) + '/' + data.total + ' albums.');
			$('#viewStatus').html('Loading albums ' + Math.min(offset + limit, data.total) + '/' + data.total);

			// test if there are more albums
			if(data.next != null) {
				this.getSavedAlbums(offset + limit, limit, update);
			} else { // no more albums
				// its okay if the num of albums differs from data.total because if an album is linked with two artists, the album is added twice
				console.log('got: ' + this.library.artists.length + ' artists, ' + this.library.artists.reduce((numAlbums, _artist) => numAlbums + _artist.albums.length, 0) + ' albums');
				console.debug(this.library.artists);
				//this.storeArtists();
				this.library.saveToLocalStorage();
				this.getGenres(0, 50, update);

				$('#viewStatus').html('');
				$('#buttonUpdateLibrary').attr('disabled', false);
			}
		};

		let fnError = function() {
			$('#buttonUpdateLibrary').attr('disabled', false);
		};

		this.sendRequest(url, type, data, fnSuccess, fnError);
	}

	getGenres(offset = 0, limit = 50, update = false) {
		console.debug('artists.length=' + this.library.artists.length);
		console.debug('getGenres(' + offset + ',' + limit + ',' + update + ')');

		if(offset === 0 && update) {
			console.debug('getGenres() update call, previous num of genres=' + this.library.genres.length);
		}

		// empty array on first call, only if this is not an update
		if(offset === 0 && update === false) {
			localStorage.removeItem('genres');
			this.library.genres = [];
		}

		let start = offset;
		let end = Math.min(offset + limit, this.library.artists.length);
		//console.debug('start=' + start + ',end=' + end);

		let artistIds = '';
		this.library.artists.slice(start, end).forEach((artist) => {
			artistIds += artist.id + ',';
		});

		let url = 'https://api.spotify.com/v1/artists'
		let data = {
			'ids': artistIds.substring(0, artistIds.length - 1)
		};
		let type = 'GET';
		let fnSuccess = function(data) {
			console.debug('start=' + start + ',end=' + end);
			data.artists.forEach(_artist => {
				let artistIdx = this.library.artists.findIndex(element => element.id === _artist.id);
				if(artistIdx !== -1) { // artist id found
					let artist = this.library.artists[artistIdx];
					artist.getGenres(this.library.genres);

					// test if artist is already linked to a genre, if so, skip because it is not a new artist
					if(this.library.genres.find(_genre => _genre.artists.find(_artist => _artist.id === artist.id) !== undefined) === undefined) {
						console.debug('processing ' + artist.name + ' because it is not already linked to a genre.');
						// only overwrite the genres attribute if there are existing genres or we overwrite the default genre 'None'
						if(_artist.genres.length > 0) {
							artist.genres = _artist.genres;
						} else {
							console.debug('got no genres setting default genre.')
							artist.addGenre(GENRE_DEFAULT.name);
							//console.debug(_artist);
						}

						// if update then add the artist to an existing genre with most artists if possible
						// needs to differentiate between update and no update because otherwise genres that come first get prioritized
						if(update) {
							let existingGenres = this.library.genres.filter(_genre => artist.genres.includes(_genre.name));
							if(existingGenres.length === 0) { // no existing genres, so just pick the first from spotify
								let genre = new Genre(artist.genres[0]);
								genre.addArtist(artist);
								this.library.genres.push(genre);

								// set artist.genres to the new genre
								artist.genres = [genre.name];
							} else { // we found at least one existing genre, now sort by number of artists
								let sortedGenres = existingGenres.sort(function(a, b) {
									if(a.artists.length > b.artists.length) {
										return -1;
									}
									if(a.artists.length < b.artists.length) {
										return 1;
									}
									return 0;
								});
								// add to the genre with most artists
								sortedGenres[0].addArtist(artist);

								// set artist.genres to the selected genre
								artist.genres = [sortedGenres[0].name];
							}

						} else {
							artist.genres.forEach(_genre => {
								//console.debug(artist);
								//console.debug('artist.genres.length=' + artist.genres.length);
								//console.debug('artist.name=' + this.library.artists[artistIdx].name + ' _genre=' + _genre);
								let genreIdx = this.library.genres.findIndex(element => element.name === _genre);
								if(genreIdx === -1) { // genre not found
									console.debug('genre ' + _genre + ' not found, adding to this.library.genres');
									let genre = new Genre(_genre);
									genre.addArtist(artist)
									this.library.genres.push(genre);
								} else { // genre found, add artist to list
									this.library.genres[genreIdx].addArtist(artist);
								}
							});
						}

					} else {
						console.debug('skipping ' + artist.name + ' because it is already linked to a genre.');
						//console.debug(artist);
					}
				}
			});
			console.log(Math.min(offset + limit, this.library.artists.length) + '/' + this.library.artists.length + ' artists.');
			$('#viewStatus').html('Loading genres for artists ' + Math.min(offset + limit, this.library.artists.length) + '/' + this.library.artists.length);

			// test if there are more genres
			if(offset + limit < this.library.artists.length) {
				this.getGenres(offset + limit, limit, update);
			} else { // no more genres
				console.log('got: ' + this.library.genres.length + ' genres');
				//console.debug(this.library.genres);
				/*this.storeGenres();
				this.storeArtists();
				this.populateViewLibrary();*/
				this.library.saveToLocalStorage();

				$('#viewStatus').html('');
			}

		}
		this.sendRequest(url, type, data, fnSuccess, null);
	}

	reduceGenres() {
		// this function reduces the amount of genres by going through each artist's spotify genres and keeping only the genre with the most occurrences within the library
		let reducedGenres = [];
		this.library.artists.forEach(_artist => {
			console.log('_artist=' + _artist.name);
			//console.log(_artist);
			let maxArtistsGenre = 0;
			let maxArtistsGenreIdx;

			_artist.getGenres(this.library.genres);

			// _artist.genres should be empty after a first reduceGenres() call
			//_artist.genres.forEach(_genre => {
			_artist.genres.forEach(_genre => {
				console.debug('_genre=' + _genre);
				// find genre with most entries
				let genreIdx = this.library.genres.findIndex(element => element.name === _genre);
				//console.log('genreIdx='+genreIdx);
				if(genreIdx !== -1) {
					console.log('maxArtistsGenre=' + maxArtistsGenre);
					console.debug('this.library.genres[genreIdx].artists.length=' + this.library.genres[genreIdx].artists.length);
					let numArtists = this.library.genres[genreIdx].artists.length;
					if(numArtists > maxArtistsGenre) {
						maxArtistsGenre = numArtists;
						maxArtistsGenreIdx = genreIdx;
					} else {
						console.debug('else');
					}
					//console.log('maxArtistsGenre='+maxArtistsGenre);
				} else {
					console.debug(_genre.name + ' not found in this.library.genres :O');
				}
			});
			// if an artist has no associated genres maxArtistsGenreIdx === undefined
			if(maxArtistsGenreIdx !== undefined) {
				console.debug(maxArtistsGenreIdx);
				console.debug('_genre mit meisten artists:' + this.library.genres[maxArtistsGenreIdx].name);

				// remove artist from genres with less artists than the main genre
				_artist.genres.forEach(_genre => {
					let genreIdx = this.library.genres.findIndex(element => element.name === _genre);
					if(genreIdx !== -1 && genreIdx !== maxArtistsGenreIdx) {
						this.library.genres[genreIdx].artists = this.library.genres[genreIdx].artists.filter(function(__artist) {
							//console.log('__artist.id=' + __artist.id + '!=' + '_artist.id=' + _artist.id);
							return (__artist.id !== _artist.id)
						});
					}
				});

				// remove genres from artist to save memory
				_artist.genres = [];

				// test if genre is not already in the new array
				if(reducedGenres.findIndex(element => element.id === this.library.genres[maxArtistsGenreIdx].id) === -1) {
					console.debug('pushing ' + this.library.genres[maxArtistsGenreIdx].name)
					console.debug(this.library.genres[maxArtistsGenreIdx]);
					reducedGenres.push(this.library.genres[maxArtistsGenreIdx]);
				}
			} else {
				console.log(_artist);
			}
		});
		console.debug(reducedGenres);

		// in case the function is called a second time reducedGenres will be empty and thus clean the db
		if(reducedGenres.length > 0) {
			this.library.genres = reducedGenres;
			/*
			this.storeGenres();
			this.storeArtists();
			this.populateViewLibrary();*/
			this.library.saveToLocalStorage();
		} else {
			console.log('reduceGenres() has delivered no change.');
		}
	}

	reduceGenresFurther() {
		console.log('reduceGenresFurther()');
		let foundMainGenres = [];
		let foundSubGenres = [];
		console.log(this.library.genres);
		// identify sub genres, i.e., genres where the name of another genre is part of the name
		this.library.genres.forEach(_genre => {
			let subGenres = this.library.genres.filter(element => element.name.includes(_genre.name) && element.id !== _genre.id);
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
		this.library.genres.forEach(_genre => {
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
		this.library.genres = foundMainGenres;

		// test if we still got all the artists
		/*
		let compArtists = [];
		this.library.genres.forEach(_genre => {
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
		this.library.saveToLocalStorage();
	}

	populateSelectGenresSub() {
		console.debug('populateSelectGenresSub()')
		let selectGenreMain = $('select#genreMain');
		let selectGenresSub = $('select#genresSub');
		let inputGenresSubKeyword = $('input#genresSubKeyword');
		selectGenresSub.attr('size', Math.ceil(this.library.genres.length / 10));
		selectGenresSub.empty();
		let selectedGenreMainValue = selectGenreMain.children(':selected').attr('value');
		this.library.genres.forEach(_genre => {
			//console.log(inputGenresSubKeyword.val());
			if(selectedGenreMainValue !== _genre.id && _genre.name.includes(inputGenresSubKeyword.val())) {
				selectGenresSub.append($('<option />').val(_genre.id).text(_genre.name));
			}
		});
	}

	reduceGenresManually() {
		console.debug('reduceGenresManually()');
		if($('#viewManageGenres').is(':visible')) {
			let selectGenreMain = $('select#genreMain');
			selectGenreMain.empty();

			let selectGenreSub = $('select#genresSub');
			selectGenreSub.empty();
			selectGenreSub.change(() => {
				if($('select#genresSub').val().length > 0) {
					$('button#buttonStoreGenresSub').attr('disabled', false);
				} else {
					$('button#buttonStoreGenresSub').attr('disabled', true);
				}
			});
			this.populateSelectGenresSub();

			this.library.genres.forEach(_genre => {
				selectGenreMain.append($('<option />').val(_genre.id).text(_genre.name));
			});

			$('select#genreMain').change(this.populateSelectGenresSub.bind(this));

			$('input#genresSubKeyword').on('input', this.populateSelectGenresSub.bind(this));

			$('button#buttonStoreGenresSub').click(() => {
				console.log('buttonStoreGenresSub click');

				$('button#buttonStoreGenresSub').attr('disabled', true);

				let genreMain = this.library.genres.find(element => element.id === selectGenreMain.val());
				//console.log(genreMain);
				if(genreMain !== undefined) {
					//console.log(selectGenreSub.children(':selected'));
					// add all the artists of the found sub genres to the main genre
					selectGenreSub.val().forEach(_idGenreSub => {
						console.log(_idGenreSub);
						let genreSubIdx = this.library.genres.findIndex(element => element.id === _idGenreSub);
						//console.log(this.library.genres[genreSubIdx]);
						if(genreSubIdx !== -1) {
							this.library.genres[genreSubIdx].artists.forEach(_artist => {
								genreMain.addArtist(_artist);
							});
							//genreMain.addSubGenre(this.library.genres[genreSubIdx]);

							// remove sub genre from main array
							this.library.genres.splice(genreSubIdx, 1);
						}
					});

					$('input#genresSubKeyword').val('');
					let selectGenreMain = $('select#genreMain');
					selectGenreMain.empty();
					this.library.genres.forEach(_genre => {
						selectGenreMain.append($('<option />').val(_genre.id).text(_genre.name));
					});
					selectGenreMain.val(this.library.genres[0].id).trigger('change');

					// sort artists
					genreMain.artists.sort((a, b) => a.name.localeCompare(b.name));

					// store new genres
					this.library.saveToLocalStorage();
					//this.storeGenres();
					//this.populateViewLibrary();
				}
			});
		}
	}

	startPlayback(albumId) {
		let url = 'https://api.spotify.com/v1/me/player/play?device_id=' + this.options.selectedDevice;
		let type = 'PUT';
		let data = JSON.stringify({
			'context_uri': 'spotify:album:' + albumId,
			'position_ms': 0,
		});
		let fnSuccess = function() {
			console.log('startPlayback successful');
		};
		this.sendRequest(url, type, data, fnSuccess);
	}

	generateUlFromArtists(artists) {
		//console.log('generateUlFromArtists()');
		const ulLibraryNew = document.createElement('ul');
		ulLibraryNew.id = 'ulLibrary';

		let fragment = document.createDocumentFragment();
		for(let i = 0, I = artists.length; i < I; i++) {
			let artist = artists[i];
			//artists.forEach(artist => {

			let ulAlbums = document.createElement('ul');
			ulAlbums.id = 'ulLibrary';
			ulAlbums.classList.add('nested');

			let liArtist = document.createElement('li');
			liArtist.classList.add('caret');

			let spanArtistName = document.createElement('span');
			spanArtistName.textContent = artist.name;
			spanArtistName.id = artist.id;
			spanArtistName.classList.add('caret', 'artist');
			spanArtistName.draggable = true;

			// test if span already exists
			//let existingSpanArtistName = $('span#' + artist.id);
			let existingSpanArtistName = document.getElementById(artist.id);
			//console.log('testing ' + 'span#'+artist.id);
			//console.log('existingSpanArtistName.length='+existingSpanArtistName.length);
			//if(existingSpanArtistName.length > 0 && existingSpanArtistName.hasClass('collapsable')) {
			if(existingSpanArtistName !== null && existingSpanArtistName.classList.contains('collapsable')) {
				//console.log('existingSpanArtistName' + ' span#'+artist.id);
				// restore expanded state
				spanArtistName.classList.add('collapsable');
				ulAlbums.classList.add('active');
			} else {
				//console.log('existingSpanArtistName existiert nicht');
				spanArtistName.classList.add('expandable');
			}

			spanArtistName.addEventListener('click', () => {
				//console.log('addEventListener call');
				ulAlbums.classList.toggle('active');
				spanArtistName.classList.toggle('expandable');
				spanArtistName.classList.toggle('collapsable');
			});

			spanArtistName.addEventListener('dragstart', (event) => {
				// traverse DOM tree back to the genre span and read the id
				let genreId = event.target.parentNode.parentNode.parentNode.children[0].id;
				this.dragged = [genreId, event.target.id];
				//console.log(this.dragged);
			});

			liArtist.appendChild(spanArtistName);
			//ulLibraryNew.appendChild(liArtist);
			fragment.appendChild(liArtist);

			// sort albums (Todo: different location?)
			artist.albums.sort((a, b) => a.name.localeCompare(b.name));

			if(this.options.sortAlbums === SORT_BY_YEAR) {
				artist.albums.sort((a, b) => new Date(a.releaseDate) < new Date(b.releaseDate) ? -1 : 1);
			}

			let fragmentAlbums = document.createDocumentFragment();
			for(let j = 0, J = artist.albums.length; j < J; j++) {
				let album = artist.albums[j];
				//artist.albums.forEach((album) => {
				let liAlbum = document.createElement('li');
				let spanAlbum = document.createElement('span');
				spanAlbum.classList.add('album');
				//spanAlbum.textContent = new Date(album.releaseDate).getFullYear() + ' ' + album.name;
				//spanAlbum.textContent = album.name;
				spanAlbum.innerText = new Date(album.releaseDate).getFullYear() + ' ' + album.name;
				//spanAlbum.innerText = album.name;
				spanAlbum.addEventListener('click', () => {
					this.startPlayback(album.id);
				});
				liAlbum.appendChild(spanAlbum);
				fragmentAlbums.appendChild(liAlbum);
				//});
			}
			ulAlbums.appendChild(fragmentAlbums);
			liArtist.appendChild(ulAlbums);

			//});
		}
		ulLibraryNew.appendChild(fragment);
		return ulLibraryNew;
	}

	populateViewLibrary() {
		console.debug('populateViewLibrary()');

		if(this.options.view === VIEW_ARTIST && this.library.artists != null) {
			this.populateViewLibraryFromArtists(this.library.artists);
		} else if(this.options.view === VIEW_GENRE && this.library.genres != null) {
			this.populateViewLibraryFromGenres(this.library.genres);
		}

		this.filterViewLibrary();

		$('div#viewStats').text('Holding: ' + this.library.genres.length + ' Genres, ' + this.library.artists.length + ' Artists, ' + this.library.artists.reduce((numAlbums, _artist) => numAlbums + _artist.albums.length, 0) + ' Albums');
	}

	filterViewLibrary() {
		console.debug('filterViewLibrary()');
		//console.time('a');

		// apply filter
		let keyword = $('input#searchKeyword').val();

		// select only the not nested lis
		//let lis = $('ul#ulLibrary > li:not(.caret)');
		// select all lis which leads to filtering also artists
		let lis = $('ul#ulLibrary > li');
		lis.hide();

		//let filteredSpansAlbum = $('ul#ulLibrary > li > span.album:icontains(' + keyword + ')');
		let filteredSpansAlbum = $('span.album:icontains(' + keyword + ')');
		//let filteredSpansAlbum = lis.find('span.album:icontains(' + keyword + ')');
		//console.log(filteredSpansAlbum);
		filteredSpansAlbum.each(function() {
			$(this).parents('li').css('display', 'block');
			//$(this).parents('li').show();
		});

		//let filteredSpansArtist = $('ul#ulLibrary > li > span.artist:icontains(' + keyword + ')');
		let filteredSpansArtist = $('span.artist:icontains(' + keyword + ')');
		filteredSpansArtist.each(function() {
			// test if parent li is not visible. if it is not visible make all parent lis visible
			if($(this).parent('li').css('display') === 'none') {
				$(this).parents('li').css('display', 'block');
				//$(this).parents('li').show();
				//$(this).siblings('ul').find('li').show();
			}
			// make all albums visible
			$(this).siblings('ul').find('li').css('display', 'block');
		});

		//let filteredSpansGenre = $('ul#ulLibrary > li > span.genre:icontains(' + keyword + ')');
		let filteredSpansGenre = $('span.genre:icontains(' + keyword + ')');
		filteredSpansGenre.each(function() {
			if($(this).parent('li').css('display') === 'none') {
				$(this).parents('li').css('display', 'block');
				$(this).siblings('ul').find('li').css('display', 'block');
				//$(this).parents('li').show();
				//$(this).siblings('ul').find('li').show();
			}
		});


		/*
				let filteredSpansa = document.querySelectorAll('ul#ulLibrary > li > span.album,span.artist,span.genre');

				console.time('b');
				let filteredSpansb = document.evaluate("//span[(contains(@class, 'album') or contains(@class, 'artist') or contains(@class, 'genre') ) and contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '"+keyword+"')]", document, null, XPathResult.ANY_TYPE, null)
				console.timeEnd('b');
				console.time('c');
				let filteredSpansc = $('span.album:icontains(' + keyword + '),.artist:icontains(' + keyword + '),.genre:icontains(' + keyword + ')');
				console.timeEnd('c');
		 */
		/*
				//let filteredSpans = $('span.album:icontains(' + keyword + '),.artist:icontains(' + keyword + '),.genre:icontains(' + keyword + ')');
				let filteredSpans = document.evaluate("//span[(contains(@class, 'album') or contains(@class, 'artist') or contains(@class, 'genre') ) and contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '"+keyword+"')]", document, null, XPathResult.ANY_TYPE, null)
				//let filteredSpans = document.querySelectorAll('span.album,span.artist,span.genre');
				console.debug('filteredSpans.length=' + filteredSpans.length);
				//for(let i=0, I = filteredSpans.length; i < I; i++) {
				let filteredSpan = filteredSpans.iterateNext();
				while(filteredSpan) {
					//let filteredSpan = filteredSpans[i];
					if(filteredSpan.classList.contains('album')) {
						$(filteredSpan).parents('li').css('display', 'block');
					} else if(filteredSpan.classList.contains('artist')) {
						if($(filteredSpan).parent('li').css('display') === 'none') {
							$(filteredSpan).parents('li').css('display', 'block');
							$(filteredSpan).siblings('ul').find('li').css('display', 'block');
							//$(this).parents('li').show();
							//$(this).siblings('ul').find('li').show();
						}
					} else if(filteredSpan.classList.contains('genre')) {
						if($(filteredSpan).parent('li').css('display') === 'none') {
							$(filteredSpan).parents('li').css('display', 'block');
							$(filteredSpan).siblings('ul').find('li').css('display', 'block');
							//$(this).parents('li').show();
							//$(this).siblings('ul').find('li').show();
						}
					}
					filteredSpan = filteredSpans.iterateNext();
				}
				*/

		//console.timeEnd('a');
	}

	populateViewLibraryFromArtists(artists) {
		console.log('populateViewLibraryFromArtists()');
		const ulLibraryNew = this.generateUlFromArtists(artists);

		// switch content of old ul to new ul because we need to keep the expanded items expanded
		const divLibrary = $('#divLibrary');
		divLibrary.empty();
		divLibrary.append(ulLibraryNew);
	}

	populateViewLibraryFromGenres(genres) {
		console.debug('populateViewLibraryFromGenres()');
		const ulLibraryNew = document.createElement('ul');
		ulLibraryNew.id = 'ulLibrary';

		//console.log(genres);
		for(let i = 0, I = genres.length; i < I; i++) {
			let genre = genres[i];
			//genres.forEach(genre => {
			let ulArtists = this.generateUlFromArtists(genre.artists);
			ulArtists.classList.add('nested');

			let liGenre = document.createElement('li');

			let spanGenreName = document.createElement('span');
			spanGenreName.textContent = genre.name + ' (' + genre.artists.length + ')';
			spanGenreName.id = genre.id;
			spanGenreName.classList.add('caret', 'genre');
			spanGenreName.draggable = true;

			spanGenreName.addEventListener('dragstart', (event) => {
				this.dragged = event.target.id;
			});

			spanGenreName.addEventListener('dragenter', (event) => {
				event.target.classList.add('highlight');
			});

			spanGenreName.addEventListener('dragover', (event) => {
				if(typeof this.dragged === 'string') {
					if(this.dragged !== event.target.id) {
						event.preventDefault();
					}
				} else if(this.dragged instanceof Array) {
					if(this.dragged[0] !== event.target.id) {
						event.preventDefault();
					}
				}

			});

			spanGenreName.addEventListener('dragleave', (event) => {
				event.target.classList.remove('highlight');
			});

			spanGenreName.addEventListener('drop', (event) => {
				console.debug(this.stateNavigator);
				event.target.classList.remove('highlight');
				//console.log(this.dragged);
				let idGenreMain = event.target.id;
				let genreMain = this.library.genres.find(element => element.id === idGenreMain);
				//console.log('idGenreMain=' + idGenreMain);

				if(typeof this.dragged === 'string') {
					// add all the artists of the found sub genres to the main genre
					let idGenreSub = this.dragged;
					//console.log('idGenreSub=' + idGenreSub);

					// need the genre index to remove the item from the this.library.genres array
					let genreSubIdx = this.library.genres.findIndex(element => element.id === idGenreSub);
					let genreSub = this.library.genres[genreSubIdx];

					//console.log(this.library.genres[genreSubIdx]);
					if(genreMain !== undefined && genreSubIdx !== -1 && genreMain.id !== genreSub.id) {
						genreSub.artists.forEach(_artist => {
							genreMain.addArtist(_artist);
						});

						// add sub genre to main genre
						//genreMain.addSubGenre(genreSub);

						// remove sub genre from main array
						this.library.genres.splice(genreSubIdx, 1);

						// todo: codeschnipsel kommt häufiger vor
						// sort artists
						genreMain.artists.sort((a, b) => a.name.localeCompare(b.name));

						console.log('sub genre ' + idGenreSub + ' has been dragged to ' + idGenreMain + '.');
					}
				} else if(this.dragged instanceof Array) {
					if(genreMain !== undefined) {
						//console.log('moving to ' + genreMain.id);
						// aus gedraggtem genre entfernen. ggf lieber übers this.dragged identifizieren weil der artist in mehreren genres drin sein kann
						let oldGenreIdx = this.library.genres.findIndex(element => element.id === this.dragged[0]);
						if(oldGenreIdx !== -1) {
							let artistIdx = this.library.genres[oldGenreIdx].artists.findIndex(element => element.id === this.dragged[1]);
							if(artistIdx !== -1) {
								this.library.genres[oldGenreIdx].artists.splice(artistIdx, 1);
							}
						}

						let artist = this.library.artists.find(element => element.id === this.dragged[1]);
						if(artist !== undefined) {
							genreMain.addArtist(artist);

							console.log('single artist ' + artist.name + ' has been dragged to ' + idGenreMain + '.');
						}
						// todo: codeschnipsel kommt häufiger vor
						// sort artists
						genreMain.artists.sort((a, b) => a.name.localeCompare(b.name));


					}
				}
				// store new genres
				//this.storeGenres();
				//this.populateViewLibrary();
				this.library.saveToLocalStorage();
			});
			// test if span already exists
			let existingSpanGenreName = $('span#' + genre.id);
			if(existingSpanGenreName.length > 0 && existingSpanGenreName.hasClass('collapsable')) {
				//console.log('existingSpanArtistName' + ' span#'+artist.id);
				// restore expanded state
				spanGenreName.classList.add('collapsable');
				ulArtists.classList.add('active');
			} else {
				//console.log('existingSpanArtistName existiert nicht');
				spanGenreName.classList.add('expandable');
			}

			spanGenreName.addEventListener('click', () => {
				//console.log('addEventListener call');
				ulArtists.classList.toggle('active');
				spanGenreName.classList.toggle('expandable');
				spanGenreName.classList.toggle('collapsable');
			});

			liGenre.append(spanGenreName);
			ulLibraryNew.appendChild(liGenre);
			liGenre.appendChild(ulArtists);
			//});
		}
		// switch content of old ul to new ul because we need to keep the expanded items expanded
		const divLibrary = $('#divLibrary');
		divLibrary.empty();
		divLibrary.append(ulLibraryNew);
	}

	getDevices() {
		let url = 'https://api.spotify.com/v1/me/player/devices';
		let type = 'GET';
		let fnSuccess = function(data) {
			this.arrayDevices = [];
			data.devices.forEach(device => {
				this.arrayDevices.push(new Device(device.id, device.name, device.is_active));
			});

			this.populateSelectDevices(this.arrayDevices);
			console.debug('getDevices()');
			console.debug(data);

			$('#buttonReloadDevices').attr('disabled', false);
		};

		let fnError = function() {
			$('#buttonReloadDevices').attr('disabled', false);
		};

		this.sendRequest(url, type, {}, fnSuccess, fnError);
	}

	populateSelectDevices(arrayDevices) {
		//console.log(arrayDevices);
		const selectDevices = $('#selectDevices');
		selectDevices.empty();
		arrayDevices.forEach(device => {
			const option = document.createElement('option');
			option.id = device.id;
			option.textContent = device.name;
			if(device.active) {
				this.options.selectedDevice = device.id;
				option.selected = true;
			}
			selectDevices.append(option);
		});

		let deviceActive = this.arrayDevices.find(element => element.active === true);
		if(arrayDevices.length > 0) {
			if(deviceActive === undefined) {
				this.options.selectedDevice = arrayDevices[0].id;
			}
			$('#viewSelectDevicesWithoutButton').show();
		} else {
			$('#viewSelectDevicesWithoutButton').hide();
		}
	}

	/*
	storeGenres() {
		// sort genres alphabetically
		this.library.genres.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('genres');
		localStorage.setItem('genres', JSON.stringify(this.library.genres, Utils.replacerGenres));


		// could use some sort of genreUpdateListener here
		if($('#viewManageGenres').is(':visible')) {
			console.log('viewManageGenres is visible')
			this.reduceGenresManually();
		}
	}

	storeArtists() {
		// sort artists alphabetically
		this.library.artists.sort((a, b) => a.name.localeCompare(b.name));

		localStorage.removeItem('artists');
		// todo: remove genres from artists when storing, write replacer
		localStorage.setItem('artists', JSON.stringify(this.library.artists, Utils.replacerArtists));
	}


	removeEmptyGenres() {
		this.library.genres = this.library.genres.filter(_genre => _genre.artists.length > 0);
		this.storeGenres();
		this.populateViewLibrary();
	}*/

	static generateRandomString(length) {
		let text = '';
		let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

		for(let i = 0; i < length; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	static async generateCodeChallenge(codeVerifier) {
		function base64encode(string) {
			return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=+$/, '');
		}

		const encoder = new TextEncoder();
		const data = encoder.encode(codeVerifier);
		const digest = await window.crypto.subtle.digest('SHA-256', data);

		return base64encode(digest);
	}

	static authorize() {
		let codeVerifier = Spotify.generateRandomString(128);

		Spotify.generateCodeChallenge(codeVerifier).then(codeChallenge => {
			let state = Spotify.generateRandomString(16);
			let scope = 'user-library-read user-modify-playback-state user-read-playback-state';

			localStorage.setItem('code_verifier', codeVerifier);
			console.log('set code_verifier=' + codeVerifier);

			let args = new URLSearchParams({
				response_type: 'code',
				client_id: clientId,
				scope: scope,
				redirect_uri: redirectUri,
				state: state,
				code_challenge_method: 'S256',
				code_challenge: codeChallenge
			});

			window.location = 'https://accounts.spotify.com/authorize?' + args;
		});
	}

	getAccessToken(code) {
		let codeVerifier = localStorage.getItem('code_verifier');

		let url = URL_AUTH;
		let type = 'POST';
		let data = {
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: redirectUri,
			client_id: clientId,
			code_verifier: codeVerifier
		};
		let fnSuccess = function(data) {
			console.log('data');
			console.log(data);

			localStorage.setItem('access_token', data.access_token);
			localStorage.setItem('refresh_token', data.refresh_token);
			Utils.login(this, data.access_token);
		};
		let fnError = function(error) {
			console.error('Error:', error);
			Utils.logout();
		};
		this.sendRequest(url, type, data, fnSuccess, fnError);
	}

	refreshAccessToken(refreshToken, fnSuccessB) {
		console.log('refreshAccessToken()');
		let url = URL_AUTH;
		let type = 'POST';
		let data = {
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: clientId
		};
		let fnSuccess = function(data) {
			console.log('data');
			console.log(data);

			localStorage.setItem('access_token', data.access_token);
			localStorage.setItem('refresh_token', data.refresh_token);
			Utils.login(this, data.access_token);

			// re-execute request that triggered the refreshAccessToken call
			if(fnSuccessB != null) {
				fnSuccessB.apply()
			}
		};
		let fnError = function(error) {
			console.error('Error:', error);
			// todo: logout if refreshAccessToken fails
			//Utils.logout();
		}
		this.sendRequest(url, type, data, fnSuccess, fnError);
	}
}