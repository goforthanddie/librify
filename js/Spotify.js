const clientId = 'f77bc91de5834f398680d65c02bdfe94';
//const redirectUri = 'https://librify.coderbutze.de';
const redirectUri = 'http://localhost:63342/SpotifyTree/index.html';

const URL_AUTH = 'https://accounts.spotify.com/api/token';

class Spotify {

	artists;
	options;
	genres;
	accessToken;
	arrayDevices;

	dragged;

	constructor() {
		this.options = new Options();

		this.accessToken = null;

		let artists = localStorage.getItem('artists');
		if(artists != null) {
			this.artists = JSON.parse(artists, Utils.reviverArtists);
			console.log('retrieved ' + this.artists.length + ' artists');
		} else {
			this.artists = [];
		}

		// must parse artists before genres. artists in genres are only identified by an id and retrieved during the revive process.
		let genres = localStorage.getItem('genres');
		if(genres != null) {
			this.genres = JSON.parse(genres, this.reviverGenres);
		} else {
			// add the default genre so all artists without a genre other than the default genre will end up in this genre
			this.genres = [GENRE_DEFAULT];
		}

		this.arrayDevices = [];
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

	sendRequest(url, type, data, fnSuccess, fnError, counter = 1) {
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
			statusCode: { // todo: wenn das token refreshed wurde muss der letzte request erneut abgesetzt werden :o?
				401: function() { // 401: Unauthorized - The request requires user authentication or, if the request included authorization credentials, authorization has been refused for those credentials.
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

	getGenres(offset = 0, limit = 50) {
		console.debug('artists.length=' + this.artists.length);

		let start = offset;
		let end = Math.min(offset + limit, this.artists.length);
		console.debug('start=' + start + ',end=' + end);

		let artistIds = '';
		this.artists.slice(start, end).forEach((artist) => {
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
				let artistIdx = this.artists.findIndex(element => element.id === _artist.id);
				if(artistIdx !== -1) { // artist id found
					// only overwrite the genres attribute if there are existing genres or we overwrite the default genre 'None'
					if(_artist.genres.length > 0) {
						this.artists[artistIdx].genres = _artist.genres;
					} else {
						console.debug('got no genres.')
					}

					this.artists[artistIdx].genres.forEach(_genre => {
						let genreIdx = this.genres.findIndex(element => element.name === _genre);
						if(genreIdx === -1) { // genre not found
							console.debug('genre ' + _genre + ' not found, adding to this.genres');
							let genre = new Genre(_genre);
							genre.addArtist(this.artists[artistIdx])
							this.genres.push(genre);
						} else { // genre found, add artist to list
							this.genres[genreIdx].addArtist(this.artists[artistIdx]);
						}
					});
				}
			});
			// test if there are more genres
			if(offset + limit < this.artists.length) {
				this.getGenres(offset + limit, limit);
			} else { // no more genres
				this.genres.sort((a, b) => a.name.localeCompare(b.name));
				localStorage.removeItem('genres');
				localStorage.setItem('genres', JSON.stringify(this.genres, Utils.replacerGenres));
				localStorage.removeItem('artists');
				localStorage.setItem('artists', JSON.stringify(this.artists));

				this.populateViewLibrary();
			}

		}
		this.sendRequest(url, type, data, fnSuccess, null);
	}

	reduceGenres() {
		// this function reduces the amount of genres by going through each artists spotify genres and keeping only the genre with the most occurrences within the library
		let reducedGenres = [];
		this.artists.forEach(_artist => {
			console.log('_artist=' + _artist.name);
			console.log(_artist);
			let maxArtistsGenre = 0;
			let maxArtistsGenreIdx;
			_artist.genres.forEach(_genre => {
				console.debug('_genre=' + _genre);
				// find genre with most entries
				let genreIdx = this.genres.findIndex(element => element.name === _genre);
				//console.log('genreIdx='+genreIdx);
				if(genreIdx !== -1) {
					//console.log('maxArtistsGenre='+maxArtistsGenre);
					//console.debug('this.genres[genreIdx].artists.length='+this.genres[genreIdx].artists.length);
					if(this.genres[genreIdx].artists.length > maxArtistsGenre) {
						maxArtistsGenre = this.genres[genreIdx].artists.length;
						maxArtistsGenreIdx = genreIdx;
					} else {
						console.debug('else');
					}
					//console.log('maxArtistsGenre='+maxArtistsGenre);
				} else {
					console.debug(_genre.name + ' not found in this.genres :O');
				}
			});
			console.debug(maxArtistsGenreIdx);
			console.debug('_genre mit meisten artists:' + this.genres[maxArtistsGenreIdx].name);

			// test if genre is not already in the new array
			if(reducedGenres.findIndex(element => element.id === this.genres[maxArtistsGenreIdx].id) === -1) {
				console.debug('pushing ' + this.genres[maxArtistsGenreIdx].name)
				console.debug(this.genres[maxArtistsGenreIdx]);
				reducedGenres.push(this.genres[maxArtistsGenreIdx]);
			}
		});
		console.debug(reducedGenres);

		this.genres = reducedGenres;
		this.genres.sort((a, b) => a.name.localeCompare(b.name));
		localStorage.removeItem('genres');
		localStorage.setItem('genres', JSON.stringify(this.genres, Utils.replacerGenres));
		this.populateViewLibrary();
	}

	reduceGenresFurther() {
		console.log('reduceGenresFurther()');
		let foundMainGenres = [];
		let foundSubGenres = [];
		console.log(this.genres);
		// identify sub genres, i.e., genres where the name of another genre is part of the name
		this.genres.forEach(_genre => {
			let subGenres = this.genres.filter(element => element.name.includes(_genre.name) && element !== _genre);
			// test for length > 1 because it will always find itself
			if(subGenres.length > 0) {
				subGenres.forEach(_subgenre => {
					console.log('subgenre ' + _subgenre.name);
					// add all the artists of the found sub genres to the main genre
					_subgenre.artists.forEach(_artist => {
						_genre.addArtist(_artist);
					});

					_genre.addSubGenre(_subgenre);
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
		let compArtists = [];
		this.genres.forEach(_genre => {
			_genre.artists.forEach(_artist => {
				if(compArtists.findIndex(element => element.id === _artist.id) === -1) {
					compArtists.push(_artist)
				}
			})
		});
		console.log('compArtists.length=' + compArtists.length);
		console.log(compArtists.sort((a, b) => a.name.localeCompare(b.name)));

		localStorage.removeItem('genres');
		localStorage.setItem('genres', JSON.stringify(this.genres, Utils.replacerGenres));
		this.populateViewLibrary();
	}

	populateSelectGenresSub() {
		console.log('populateSelectGenresSub')
		let selectGenreMain = $('select#genreMain');
		let selectGenresSub = $('select#genresSub');
		let inputGenresSubKeyword = $('input#genresSubKeyword');
		selectGenresSub.attr('size', Math.ceil(this.genres.length / 10));
		selectGenresSub.empty();
		let selectedGenreMainValue = selectGenreMain.children(':selected').attr('value');
		this.genres.forEach(_genre => {
			//console.log(inputGenresSubKeyword.val());
			if(selectedGenreMainValue !== _genre.id && _genre.name.includes(inputGenresSubKeyword.val())) {
				selectGenresSub.append($('<option />').val(_genre.id).text(_genre.name));
			}
		});
	}

	reduceGenresManually() {
		let selectGenreMain = $('select#genreMain');
		let selectGenreSub = $('select#genresSub');
		this.genres.forEach(_genre => {
			selectGenreMain.append($('<option />').val(_genre.id).text(_genre.name));
		});

		$('select#genreMain').change(this.populateSelectGenresSub.bind(this));

		$('input#genresSubKeyword').on('input', this.populateSelectGenresSub.bind(this));

		$('button#buttonStoreGenresSub').click(() => {
			console.log('buttonStoreGenresSub click');

			let genreMain = this.genres.find(element => element.id === selectGenreMain.val());
			console.log(genreMain);
			if(genreMain !== undefined) {
				console.log(selectGenreSub.children(':selected'));
				// add all the artists of the found sub genres to the main genre
				selectGenreSub.val().forEach(_idGenreSub => {
					console.log(_idGenreSub);
					let genreSubIdx = this.genres.findIndex(element => element.id === _idGenreSub);
					console.log(this.genres[genreSubIdx]);
					if(genreSubIdx !== -1) {
						this.genres[genreSubIdx].artists.forEach(_artist => {
							genreMain.addArtist(_artist);
						});
						genreMain.addSubGenre(this.genres[genreSubIdx]);

						// remove sub genre from main array
						this.genres.splice(genreSubIdx, 1);
					}
				});

				$('input#genresSubKeyword').val('');
				let selectGenreMain = $('select#genreMain');
				selectGenreMain.empty();
				this.genres.forEach(_genre => {
					selectGenreMain.append($('<option />').val(_genre.id).text(_genre.name));
				});
				selectGenreMain.val(this.genres[0].id).trigger('change');

				// sort artists
				genreMain.artists.sort((a, b) => a.name.localeCompare(b.name));
				// store new genres
				localStorage.removeItem('genres');
				localStorage.setItem('genres', JSON.stringify(this.genres, Utils.replacerGenres));
				this.populateViewLibrary();
			}
		});

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
			console.log('getDevices()');
			console.log(data);
		};
		this.sendRequest(url, type, {}, fnSuccess, null);
	}

	populateSelectDevices(arrayDevices) {
		console.log(arrayDevices);
		const selectDevices = $('#selectDevices');
		selectDevices.empty();
		arrayDevices.forEach(device => {
			const option = document.createElement('option');
			option.id = device.id;
			option.innerHTML = device.name;
			if(device.active) {
				this.options.selectedDevice = device.id;
				option.selected = true;
			}
			selectDevices.append(option);
		});

		let deviceActive = this.arrayDevices.find(element => element.active == true);
		if(deviceActive === undefined) {
			this.options.selectedDevice = arrayDevices[0].id;
		}
	}

	getSavedAlbums(offset = 0, limit = 50) {
		if(localStorage.getItem('login') !== '1') return;
		console.log('getSavedAlbums(' + offset + ',' + limit + ')');
		let url = 'https://api.spotify.com/v1/me/albums';
		let type = 'GET';
		let data = {
			'limit': limit,
			'offset': offset
		};
		let fnSuccess = function(data) {
			//console.log(data);
			// iterate over returned albums
			data.items.forEach(item => {
				//console.log(item.album);
				let album = new Album(item.album.id, item.album.name, item.album.release_date, item.album.release_date_precision);
				//console.log(album);
				// iterate over artists of album
				item.album.artists.forEach(_artist => {
					// test if artist is already in list
					let artistIdx = this.artists.findIndex(element => element.id === _artist.id);
					if(artistIdx === -1) { // artist id not found, add new artist
						let artist = new Artist(_artist.id, _artist.name);
						//artist.genres = this.getGenres(_artist.id);
						artist.addAlbum(album);
						this.artists.push(artist);
					} else { // artist id found, add album to existing artist
						//console.log(this.artists[idArtist]);
						this.artists[artistIdx].addAlbum(album);
					}
				});
			});

			console.log(Math.min(offset + limit, data.total) + '/' + data.total);
			$('#viewStatus').html('Loading albums ' + Math.min(offset + limit, data.total) + '/' + data.total);

			// test if there are more albums
			if(data.next != null) {
				this.getSavedAlbums(offset + limit, limit);
			} else { // no more albums
				console.log('no more albums');
				// sort artists alphabetically
				this.artists.sort((a, b) => a.name.localeCompare(b.name));
				//console.log(this.artists);

				localStorage.setItem('artists', JSON.stringify(this.artists));
				this.getGenres(0, 50);
				this.populateViewLibraryFromArtists(this.artists);

				$('#viewStatus').html('');
			}
		}
		this.sendRequest(url, type, data, fnSuccess);
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
		const ulLibraryNew = document.createElement('ul');
		ulLibraryNew.id = 'ulLibrary';
		artists.forEach(artist => {

			let ulAlbums = document.createElement('ul');
			ulAlbums.classList.add('nested');

			let liArtist = document.createElement('li');
			liArtist.classList.add('caret');

			let spanArtistName = document.createElement('span');
			spanArtistName.innerHTML = artist.name;
			spanArtistName.id = artist.id;
			spanArtistName.classList.add('caret');
			spanArtistName.classList.add('artist');
			spanArtistName.draggable = true;

			// test if span already exists
			let existingSpanArtistName = $('span#' + artist.id);
			//console.log('testing ' + 'span#'+artist.id);
			//console.log('existingSpanArtistName.length='+existingSpanArtistName.length);
			if(existingSpanArtistName.length > 0 && existingSpanArtistName.hasClass('collapsable')) {
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
				console.log(this.dragged);
			});

			liArtist.append(spanArtistName);
			ulLibraryNew.appendChild(liArtist);

			// sort albums (Todo: different location?)
			artist.albums.sort((a, b) => a.name.localeCompare(b.name));

			if(this.options.sortAlbums === SORT_BY_YEAR) {
				artist.albums.sort((a, b) => new Date(a.releaseDate) < new Date(b.releaseDate) ? -1 : 1);
			}

			artist.albums.forEach((album) => {
				let liAlbum = document.createElement('li');
				liAlbum.innerHTML = new Date(album.releaseDate).getFullYear() + ' ' + album.name;
				liAlbum.addEventListener('click', () => {
					this.startPlayback(album.id);
				});
				ulAlbums.appendChild(liAlbum);
			})
			liArtist.appendChild(ulAlbums);
		});
		return ulLibraryNew;
	}

	populateViewLibrary() {
		if(this.options.view === VIEW_ARTIST && this.artists != null) {
			this.populateViewLibraryFromArtists(this.artists);
		} else if(this.options.view === VIEW_GENRE && this.genres != null) {
			this.populateViewLibraryFromGenres(this.genres);
		}
	}

	populateViewLibraryFromArtists(artists) {
		const ulLibraryNew = this.generateUlFromArtists(artists);

		// switch content of old ul to new ul because we need to keep the expanded items expanded
		const divLibrary = $('#divLibrary');
		divLibrary.empty();
		divLibrary.append(ulLibraryNew);
	}

	populateViewLibraryFromGenres(genres) {
		const ulLibraryNew = document.createElement('ul');
		ulLibraryNew.id = 'ulLibrary';

		console.log(genres);
		genres.forEach(genre => {
			let ulArtists = this.generateUlFromArtists(genre.artists);
			ulArtists.classList.add('nested');

			let liGenre = document.createElement('li');

			let spanGenreName = document.createElement('span');
			spanGenreName.innerHTML = genre.name + ' (' + genre.artists.length + ')';
			spanGenreName.id = genre.id;
			spanGenreName.classList.add('caret');
			spanGenreName.classList.add('genre');
			spanGenreName.draggable = true;

			spanGenreName.addEventListener('dragstart', (event) => {
				this.dragged = event.target.id;
			});

			spanGenreName.addEventListener('dragenter', (event) => {
				event.target.classList.add('highlight');
			});

			spanGenreName.addEventListener('dragover', (event) => {
				event.preventDefault();
			});

			spanGenreName.addEventListener('dragleave', (event) => {
				event.target.classList.remove('highlight');
			});

			spanGenreName.addEventListener('drop', (event) => {
				event.target.classList.remove('highlight');
				console.log(this.dragged);
				let idGenreMain = event.target.id;
				let genreMain = this.genres.find(element => element.id === idGenreMain);
				console.log('idGenreMain=' + idGenreMain);

				if(typeof this.dragged === 'string') {
					console.log('sub genre has been dragged.')
					// add all the artists of the found sub genres to the main genre
					let idGenreSub = this.dragged;
					console.log('idGenreSub=' + idGenreSub);

					// need the genre index to remove the item from the this.genres array
					let genreSubIdx = this.genres.findIndex(element => element.id === idGenreSub);

					console.log(this.genres[genreSubIdx]);
					if(genreMain !== undefined && genreSubIdx !== -1) {
						this.genres[genreSubIdx].artists.forEach(_artist => {
							genreMain.addArtist(_artist);
						});
						genreMain.addSubGenre(this.genres[genreSubIdx]);

						// remove sub genre from main array
						this.genres.splice(genreSubIdx, 1);

						// todo: codeschnipsel kommt häufiger vor
						// sort artists
						genreMain.artists.sort((a, b) => a.name.localeCompare(b.name));
					}
				} else if (this.dragged instanceof Array) {
					console.log('single artist has been dragged.')
					if(genreMain !== undefined) {
						console.log('moving to ' + genreMain.id);
						let artist = this.artists.find(element => element.id === this.dragged[1]);
						if(artist !== undefined) {
							genreMain.addArtist(artist);
						}
					}
					// aus gedraggtem genre entfernen. ggf lieber übers this.dragged identifizieren weil der artist in mehreren genres drin sein kann
					let oldGenreIdx = this.genres.findIndex(element => element.id === this.dragged[0]);
					if(oldGenreIdx !== -1) {
						let artistIdx = this.genres[oldGenreIdx].artists.findIndex(element => element.id === this.dragged[1]);
						if(artistIdx !== -1) {
							this.genres[oldGenreIdx].artists.splice(artistIdx, 1);
						}
					}

				}
				// store new genres
				localStorage.removeItem('genres');
				localStorage.setItem('genres', JSON.stringify(this.genres, Utils.replacerGenres));
				this.populateViewLibrary();
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
		});

		// switch content of old ul to new ul because we need to keep the expanded items expanded
		const divLibrary = $('#divLibrary');
		divLibrary.empty();
		divLibrary.append(ulLibraryNew);
	}

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