const CLIENT_ID = 'f77bc91de5834f398680d65c02bdfe94';

let tmp_uri_redirect;
if(window.location.hostname === 'localhost') {
	tmp_uri_redirect = 'http://localhost:63342/SpotifyTree/index.html';
} else if(window.location.hostname === 'librify.coderbutze.de') {
	tmp_uri_redirect = 'https://librify.coderbutze.de';
} else {
	tmp_uri_redirect = '';
	console.debug(window.location.hostname + ' is not a valid hostname.');
}
const URI_REDIRECT = tmp_uri_redirect;
const URL_AUTH = 'https://accounts.spotify.com/api/token';

class Spotify {

	library;
	libraryRenderer;
	options;
	accessToken;
	arrayDevices;
	statusManager;

	constructor() {
		this.statusManager = new StatusManager($('#viewStatus'));
		this.options = new Options();
		this.accessToken = null;

		this.library = new Library(this.options);
		this.libraryRenderer = new LibraryRenderer(this, this.library, this.options);
		this.library.addUpdateListener(this.libraryRenderer.populateClusterGenres.bind(this.libraryRenderer));
		this.library.addUpdateListener(this.libraryRenderer.populateViewLibrary.bind(this.libraryRenderer));

		// we need to call this when all the update listeners have been added, so it doesn't work calling it in the constructor of StateManager.js
		this.library.stateManager.loadFromLocalStorage(false);
		this.library.stateManager.saveCurrentState();

		this.arrayDevices = [];
	}

	async sendRequest(url, type, data, fnSuccess, fnError, counter = 1) {
		console.debug('sendRequest()');
		let gotFnError = false;
		if(url === undefined || url === null) console.error('parameter url undefined or null');
		if(type === undefined || type === null) console.error('parameter type undefined or null');
		if(data === undefined || data === null) console.error('parameter data undefined or null');
		if(fnSuccess === undefined || fnSuccess === null) console.error('parameter fnSuccess undefined or null');
		if(fnError === undefined || fnError === null) {
			console.debug('parameter fnError undefined or null');
			fnError = function() {
			};
		} else {
			gotFnError = true;
		}

		let statusCodeFun = function(d) {
			console.debug(d.responseText);
			// fnError is supposed to handle error messages, if not here is a fallback
			if(gotFnError === false) {
				this.statusManager.setStatusText(d.responseJSON.error.status + ' ' + d.responseJSON.error.message);
			}
		};

		$.ajax({
			url: url,
			type: type,
			context: this,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': (this.accessToken !== null && url !== URL_AUTH) ? this.accessToken.type + '  ' + this.accessToken.token : ''
			},
			statusCode: {
				// 400: Bad Request - The request could not be understood by the server due to malformed syntax. The message body will contain more information; see Response Schema.
				400: statusCodeFun,
				// 401: Unauthorized - The request requires user authentication or, if the request included authorization credentials, authorization has been refused for those credentials.
				401: function() {
					console.debug('Got 401. Refreshing the token.');
					let refreshToken = localStorage.getItem('refresh_token');
					this.refreshAccessToken(refreshToken, () => {
						// fire request again but maximum of 5 times
						console.debug('counter=' + counter);
						if(counter < 5) {
							console.debug('retry number ' + counter);
							this.sendRequest(url, type, data, fnSuccess, fnError, ++counter);
						}
					});
				},
				// 403: Forbidden - The server understood the request, but is refusing to fulfill it.
				403: statusCodeFun,
				// 404: Not Found - The requested resource could not be found. This error can be due to a temporary or permanent condition.
				404: statusCodeFun,
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
				},
				// 500: Internal Server Error. You should never receive this error because our clever coders catch them all ... but if you are unlucky enough to get one, please report it to us through a comment at the bottom of this page.
				500: statusCodeFun,
				//	502: Bad Gateway - The server was acting as a gateway or proxy and received an invalid response from the upstream server.
				502: statusCodeFun,
				// 503: Service Unavailable - The server is currently unable to handle the request due to a temporary condition which will be alleviated after some delay. You can choose to resend the request again.
				503: statusCodeFun
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

		let update = (this.library.genres.length > 0 && this.library.artists.length > 0);
		console.debug('update=' + update);

		// only echo stats on first call
		if(update && offset === 0) {
			console.debug('getSavedAlbums() update call, previous num of artists=' + this.library.artists.length + ', previous num of albums=' + this.library.getNumAlbums())
			//console.debug(this.library.artists);
		}

		// empty array on first call, also on update in order to also remove 'unliked' albums
		if(offset === 0) {
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
					//console.debug('processing album ' + album.name);
					// test if artist is already in list
					let artistIdx = this.library.artists.findIndex(element => element.id === _artist.id);
					if(artistIdx === -1) { // artist id not found, add new artist
						//console.debug('artist not found ' + _artist.id);
						let artist = new Artist(_artist.id, _artist.name);
						//artist.genres = this.getGenres(_artist.id);
						artist.addAlbum(album);
						this.library.artists.push(artist);
					} else { // artist id found, add album to existing artist
						//console.debug('artist found ' + _artist.id);
						//console.log(this.library.artists[idArtist]);
						this.library.artists[artistIdx].addAlbum(album);
					}
				});
			});

			console.log(Math.min(offset + limit, data.total) + '/' + data.total + ' albums.');
			this.statusManager.setStatusText('Loaded ' + Math.min(offset + limit, data.total) + '/' + data.total + ' albums.');

			// test if there are more albums
			if(data.next != null) {
				this.getSavedAlbums(offset + limit, limit, update);
			} else { // no more albums
				// its okay if the num of albums differs from data.total because if an album is linked with two artists, the album is added twice
				//console.log('got: ' + this.library.artists.length + ' artists, ' + this.library.artists.reduce((numAlbums, _artist) => numAlbums + _artist.albums.length, 0) + ' albums');
				console.log('got: ' + this.library.artists.length + ' artists, ' + this.library.getNumAlbums() + ' albums');
				//console.debug(this.library.artists);
				//console.debug('inside getSavedAlbums()');
				//console.debug(this.library);
				this.library.notifyUpdateListeners();
				this.getGenres(0, 50, update);
			}
		};

		let fnError = function() {
			$('#buttonUpdateLibrary').attr('disabled', false);
		};

		this.sendRequest(url, type, data, fnSuccess, fnError);
	}

	getGenres(offset = 0, limit = 50, update = false) {
		//console.debug('artists.length=' + this.library.artists.length);
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

		// no artists in the library
		if(end === 0) {
			$('#buttonUpdateLibrary').attr('disabled', false);
			return false;
		}

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
			//console.debug('start=' + start + ',end=' + end);
			data.artists.forEach(_artist => {
				let artistIdx = this.library.artists.findIndex(element => element.id === _artist.id);
				if(artistIdx !== -1) { // artist id found
					let artist = this.library.artists[artistIdx];
					artist.getGenres(this.library.genres);

					// test if artist is already linked to a genre, if so, skip because it is not a new artist
					//console.log(this.library.genres);
					let genreIdx = this.library.genres.findIndex(_genre => _genre.artists.find(__artist => __artist.id === artist.id) !== undefined);
					//if(this.library.genres.find(_genre => _genre.artists.find(_artist => _artist.id === artist.id) !== undefined) === undefined) {
					// artist is not linked to a genre, i.e., it is a new artist
					if(genreIdx === -1) {
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
							} else { // we found at least one existing genre
								// if there is more than one genre, sort by number of artists
								if(existingGenres.length > 1) {
									existingGenres.sort(function(a, b) {
										if(a.artists.length > b.artists.length) {
											return -1;
										}
										if(a.artists.length < b.artists.length) {
											return 1;
										}
										return 0;
									});
								}

								// add to the genre with most artists
								existingGenres[0].addArtist(artist);

								// set artist.genres to the selected genre
								artist.genres = [existingGenres[0].name];
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
					// artist is linked to a genre, i.e., we already know this artist. we need to overwrite the artist object in the genres array because library.emptyArtists() has been called in getSavedAlbums()
					} else {
						console.debug('Re-adding ' + artist.name + ' because it is already linked to a genre.');
						let genre = this.library.genres[genreIdx];
						let artistIdx = genre.artists.findIndex(__artist => __artist.id === artist.id);
						if(artistIdx !== -1) {
							genre.artists[artistIdx] = artist;
						}
					}
				}
			});
			console.log(Math.min(offset + limit, this.library.artists.length) + '/' + this.library.artists.length + ' artists.');
			this.statusManager.setStatusText('Loaded genres for ' + Math.min(offset + limit, this.library.artists.length) + '/' + this.library.artists.length + ' artists.');

			// test if there are more genres
			if(offset + limit < this.library.artists.length) {
				this.getGenres(offset + limit, limit, update);
			} else { // no more genres
				console.log('got: ' + this.library.genres.length + ' genres');
				//console.log(this.library.genres);
				this.library.notifyUpdateListeners();
				$('#buttonUpdateLibrary').attr('disabled', false);
			}

		}
		this.sendRequest(url, type, data, fnSuccess, null);
	}

	getDevices() {
		console.debug('getDevices()');
		let url = 'https://api.spotify.com/v1/me/player/devices';
		let type = 'GET';
		let fnSuccess = function(data) {
			this.arrayDevices = [];
			data.devices.forEach(device => {
				this.arrayDevices.push(new Device(device.id, device.name, device.is_active));
			});

			this.libraryRenderer.populateSelectDevices(this.arrayDevices);
			this.statusManager.setStatusText('Loaded ' + this.arrayDevices.length + ' device(s).');
			$('#buttonReloadDevices').attr('disabled', false);
		};

		let fnError = function(data) {
			let errMessage;
			if(data.responseJSON !== undefined) {
				errMessage = data.responseJSON.error.message;
			} else {
				errMessage = data;
			}
			this.statusManager.setStatusText('Failed loading devices: ' + errMessage);
			$('#buttonReloadDevices').attr('disabled', false);
		};

		this.sendRequest(url, type, {}, fnSuccess, fnError);
	}

	startPlayback(albumId) {
		if(this.options.selectedDevice !== undefined) {
			let url = 'https://api.spotify.com/v1/me/player/play?device_id=' + this.options.selectedDevice;
			let type = 'PUT';
			let data = JSON.stringify({
				'context_uri': 'spotify:album:' + albumId,
				'position_ms': 0,
			});
			let fnSuccess = function() {
				console.log('startPlayback() successful');
			};
			let fnError = function (data) {
				//console.log(data.responseJSON.error.message);
				//let response = JSON.parse(data);
				this.statusManager.setStatusText('Failed to start playback: ' + data.responseJSON.error.message + '.');
			};
			this.sendRequest(url, type, data, fnSuccess, fnError);
		} else {
			this.statusManager.setStatusText('Found no active device. Activate a device, hit "Reload devices" and try again.');
		}

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
				client_id: CLIENT_ID,
				scope: scope,
				redirect_uri: URI_REDIRECT,
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
			redirect_uri: URI_REDIRECT,
			client_id: CLIENT_ID,
			code_verifier: codeVerifier
		};
		let fnSuccess = function(data) {
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
		console.debug('refreshAccessToken()');
		let url = URL_AUTH;
		let type = 'POST';
		let data = {
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: CLIENT_ID
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