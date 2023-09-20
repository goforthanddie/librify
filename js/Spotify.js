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
	options;
	accessToken;
	arrayDevices;
	statusManager;
	updateListeners;

	constructor(library, options, statusManager) {
		this.updateListeners = [];

		this.accessToken = null;
		this.arrayDevices = [];

		if(statusManager !== null && statusManager !== undefined) {
			this.statusManager = statusManager;
		} else {
			console.debug('got no statusManager object.');
		}

		if(options !== null && options !== undefined) {
			this.options = options;
		} else {
			console.debug('got no options object.');
		}

		if(library !== null && library !== undefined) {
			this.library = library;
		} else {
			console.debug('got no library object.');
		}
	}

	addUpdateListener(listener) {
		this.updateListeners.push(listener);
	}

	notifyUpdateListeners() {
		console.debug('notifyUpdateListeners()');
		for(let i = 0, I = this.updateListeners.length; i < I; i++) {
			//console.debug(this.updateListeners[i]);
			this.updateListeners[i].call();
		}
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
	*/
	getSavedAlbums(offset = 0, limit = 50) {
		console.debug('getSavedAlbums(' + offset + ',' + limit + ')');

		// if this.library.genres and this.library.artists are already defined, we make an update call on getGenres

		let update = this.library.getNumGenres() > 0 && this.library.getNumArtists() > 0;
		console.debug('update=' + update);

		// initialize tree
		if(!update && offset === 0) {
			let rootNode = new TreeNode('root', 'root');
			//this.library.tree.treeFlat.push(rootNode);
			this.library.tree = new Tree(rootNode);
		}

		// only echo stats on first call
		if(update && offset === 0) {
			console.debug('getSavedAlbums() update call, previous num of artists=' + this.library.getNumArtists() + ', previous num of albums=' + this.library.getNumAlbums())
		}

		// empty array on first call, also on update in order to also remove 'unliked' albums
		if(offset === 0) {
			this.library.emptyArtists();
			this.library.emptyAlbums();
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
				this.library.tree.addNode(album);
				//console.log(album);
				// iterate over artists of album
				item.album.artists.forEach(_artist => {
					//console.debug('processing album ' + album.name);
					// test if artist is already in list
					let artist = this.library.getArtists().find(element => element.id === _artist.id);
					if(artist === undefined) { // artist id not found, add new artist
						//console.debug('artist not found ' + _artist.id);
						let artist = new Artist(_artist.id, _artist.name);
						artist.addChild(album);
						this.library.tree.addNode(artist);

						// look for parents and replace the old artist object with the new one
						this.library.tree.treeFlat.forEach(_node => {
							let artistAsChildIx = _node.children.findIndex(_child => _child instanceof Artist && _child.id === _artist.id);
							if(artistAsChildIx !== -1) {
								_node.children[artistAsChildIx] = artist;
							}
						});
					} else { // artist id found, add album to existing artist
						//console.debug('artist found ' + _artist.id);
						artist.addChild(album);
					}
				});
			});

			// flatten the tree, so all the nodes which might have been added als childnodes will end up in the treeFlat array
			//this.library.treeFlat = TreeNode.getAllChildren(this.library.tree);

			console.log(Math.min(offset + limit, data.total) + '/' + data.total + ' albums.');
			this.statusManager.setStatusText('Loaded ' + Math.min(offset + limit, data.total) + '/' + data.total + ' albums.');

			// test if there are more albums
			if(data.next != null) {
				this.getSavedAlbums(offset + limit, limit, update);
			} else { // no more albums
				// it's okay if the num of albums differs from data.total because if an album is linked with two artists, the album is added twice
				console.log('got: ' + this.library.getNumArtists() + ' artists, ' + this.library.getNumAlbums() + ' albums');
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
		console.debug('getGenres(' + offset + ',' + limit + ',' + update + ')');

		if(offset === 0 && update === true) {
			console.debug('getGenres() update call, previous num of genres=' + this.library.getNumGenres());
			/* todo: this should be unnecessary, maybe it needs to be checked if there are 'dead' children in the genre objects
			// test if all artists in this.library.genres are still existing in this.library.artists (if all albums are unliked the artist still remains in the genres array until a reload)
			for(let i = 0, I = this.library.genres.length; i < I; i++) {
				for(let j = 0, J = this.library.genres[i].artists.length; j < J; j++) {
					let artistIdx = this.library.artists.findIndex(_artist => _artist.id === this.library.genres[i].artists[j].id);
					if(artistIdx === -1) { // no match in this.library.artists => remove from array
						this.library.genres[i].artists.splice(j, 1);
						// update length of array
						J = J-1;
					}
				}
			}
			*/
		}

		// empty array on first call, only if this is not an update
		if(offset === 0 && update === false) {
			this.library.emptyGenres();
		}

		let start = offset;
		let end = Math.min(offset + limit, this.library.getNumArtists());
		//console.debug('start=' + start + ',end=' + end);

		// no artists in the library
		if(end === 0) {
			$('#buttonUpdateLibrary').attr('disabled', false);
			return false;
		}

		let artistIds = '';
		this.library.getArtists().slice(start, end).forEach((artist) => {
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
				let artist = this.library.getArtists().find(element => element.id === _artist.id);
				if(artist !== undefined) { // artist id found
					let genres = this.library.getGenres();
					artist.getGenres(genres);

					// test if artist is already linked to a genre, if so, skip because it is not a new artist
					let genre = genres.find(_genre => _genre.children.find(__artist => __artist instanceof Artist && __artist.id === artist.id) !== undefined);
					// artist is not linked to a genre, i.e., it is a new artist
					if(genre === undefined) {
						console.debug('processing ' + artist.name + ' because it is not already linked to a genre.');
						// only overwrite the genres attribute if there are existing genres or we overwrite the default genre 'None'
						if(_artist.genres.length > 0) {
							artist.genres = _artist.genres;
						} else {
							console.debug('got no genres setting default genre.')
							artist.addGenre(GENRE_DEFAULT.name);
						}

						// if update then add the artist to an existing genre with most artists if possible
						// needs to differentiate between update and no update because otherwise genres that come first get prioritized
						if(update) {
							let existingGenres = genres.filter(_genre => artist.genres.includes(_genre.name));
							if(existingGenres.length === 0) { // no existing genres, so just pick the first from spotify
								let genre = new Genre(artist.genres[0]);
								genre.addChild(artist);
								this.library.tree.addNode(genre, this.library.tree.rootNode);
								//this.library.rootNode.addChild(genre);

								// set artist.genres to the new genre
								artist.genres = [genre.name];
							} else { // we found at least one existing genre
								// if there is more than one genre, sort by number of artists
								if(existingGenres.length > 1) {
									existingGenres.sort(function(a, b) {
										if(a.children.length > b.children.length) {
											return -1;
										}
										if(a.children.length < b.children.length) {
											return 1;
										}
										return 0;
									});
								}

								// add to the genre with most artists
								existingGenres[0].addChild(artist);

								// set artist.genres to the selected genre
								artist.genres = [existingGenres[0].name];
							}

						} else {
							artist.genres.forEach(_genre => {
								let genre = genres.find(element => element.name === _genre);
								if(genre === undefined) { // genre not found
									console.debug('genre ' + _genre + ' not found, adding to this.library.tree');
									let genre = new Genre(_genre);
									genre.addChild(artist);
									this.library.tree.addNode(genre, this.library.tree.rootNode);
									//this.library.treeFlat.push(genre);
									//this.library.treeFlat[0].addChild(genre);
								} else { // genre found, add artist to list
									genre.addChild(artist);
								}
							});
						}
						// artist is linked to a genre, i.e., we already know this artist. we need to overwrite the artist object in the genres array because library.emptyArtists() has been called in getSavedAlbums()
					} else {
						console.debug('Re-adding ' + artist.name + ' because it is already linked to a genre.');
						// re-adding is probably unnecessary and probably removing all the genres/artists
						let artistIx = genre.children.findIndex(__artist => __artist.id === artist.id);
						if(artistIx !== -1) {
							genre.children[artistIx] = artist;
						}
					}
				}
			});
			console.log(Math.min(offset + limit, this.library.getNumArtists()) + '/' + this.library.getNumArtists() + ' artists.');
			this.statusManager.setStatusText('Loaded genres for ' + Math.min(offset + limit, this.library.getNumArtists()) + '/' + this.library.getNumArtists() + ' artists.');

			// test if there are more genres
			if(offset + limit < this.library.getNumArtists()) {
				this.getGenres(offset + limit, limit, update);
			} else { // no more genres
				console.log('got: ' + this.library.getNumGenres() + ' genres');
				// we might have some dead children. happens if the last album is removed from an artist and we do not want to display that artist anymore
				this.library.tree.removeDeadChildren();
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

			this.notifyUpdateListeners();
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
			let fnError = function(data) {
				//console.log(data.responseJSON.error.message);
				//let response = JSON.parse(data);
				this.statusManager.setStatusText('Failed to start playback: ' + data.responseJSON.error.message + '.');
			};
			this.sendRequest(url, type, data, fnSuccess, fnError);
		} else {
			this.statusManager.setStatusText('Found no active device. Activate a device, hit "' + $('#buttonReloadDevices').text() + '" and try again.');
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
			// redirect to index
			window.location = URI_REDIRECT;
		};
		let fnError = function(error) {
			this.statusManager.setStatusText('Error: ' + error.responseJSON.error + ' ' + error.responseJSON.error_description);
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
			//console.log('data');
			//console.log(data);

			localStorage.setItem('access_token', data.access_token);
			localStorage.setItem('refresh_token', data.refresh_token);

			this.accessToken = new AccessToken(data.access_token, 'Bearer');
			this.getDevices();

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