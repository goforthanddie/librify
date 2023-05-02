const clientId = 'f77bc91de5834f398680d65c02bdfe94';
//const redirectUri = 'https://librify.coderbutze.de';
const redirectUri = 'http://localhost:63342/SpotifyTree/index.html';

const URL_AUTH = 'https://accounts.spotify.com/api/token';

class Spotify {

	artists;
	genres;
	accessToken;
	arrayDevices;

	constructor() {
		let artists = localStorage.getItem('artists');
		if(artists != null) {
			console.log('populating library view from stored artists');
			this.artists = JSON.parse(artists, Utils.reviver);
			this.populateViewLibraryFromArtists(this.artists);
		} else {
			this.artists = [];
		}
		// add the default genre so all artists without a genre other than the default genre will end up in this genre
		this.genres = [GENRE_DEFAULT];
		this.accessToken = null;
		this.arrayDevices = [];
	}

	sendRequest(url, type, data, fnSuccess, fnError) {
		console.log('sendRequest()');
		if(url === undefined || url === null) console.error('parameter url undefined or null');
		if(type === undefined || type === null) console.error('parameter type undefined or null');
		if(data === undefined || data === null) console.error('parameter data undefined or null');
		if(fnSuccess === undefined || fnSuccess === null) console.error('parameter fnSuccess undefined or null');
		if(fnError === undefined || fnError === null) {
			console.log('parameter fnError undefined or null');
			fnError = function() {};
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
				401: function() { // 401: Unauthorized - The request requires user authentication or, if the request included authorization credentials, authorization has been refused for those credentials.
					console.log('Got 401. Refreshing the token.');
					let refreshToken = localStorage.getItem('refresh_token');
					this.refreshAccessToken(refreshToken);
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

	getGenres() {
		console.log('artists.length='+this.artists.length);
		let numMaxIds = 50;
		for(let i = 0; i < Math.ceil(this.artists.length/numMaxIds); i++) {
			let start = i*numMaxIds;
			let end = Math.min((i+1)*numMaxIds, this.artists.length);
			console.log('start='+start+',end='+end);
			let artistIds = '';
			this.artists.slice(start, end).forEach((artist) => {
				artistIds += artist.id+',';
			});
			//console.log(artistIds);
			let url = 'https://api.spotify.com/v1/artists'
			let data = {
				'ids': artistIds.substring(0, artistIds.length-1)
			};
			let type = 'GET';
			let fnSuccess = function(data) {
				data.artists.forEach(_artist => {
					let artistIdx = this.artists.findIndex(element => element.id === _artist.id);
					if(artistIdx !== -1) { // artist id found
						this.artists[artistIdx].genres = _artist.genres;
						_artist.genres.forEach(_genre => {
							let genreIdx = this.genres.findIndex(element => element.name === _genre);
							if(genreIdx === -1) { // genre not found
								let genre = new Genre(_genre);
								genre.addArtist(this.artists[artistIdx])
								this.genres.push(genre);
							} else { // genre found, add artist to list
								this.genres[genreIdx].addArtist(this.artists[artistIdx]);
							}
						});

					}
				});
				// todo: would be enough to call it once in the final fnSuccess call
				this.genres.sort((a, b) => a.name.localeCompare(b.name));
			}
			this.sendRequest(url, type, data, fnSuccess, null);
		}
	}

	getDevices() {
		let url = 'https://api.spotify.com/v1/me/player/devices';
		let type = 'GET';
		let fnSuccess = function(data) {
			this.arrayDevices = [];
			data.devices.forEach(device => {
				this.arrayDevices.push(new Device(device.id, device.name, device.is_active));
			});

			Spotify.populateSelectDevices(this.arrayDevices);
			console.log('getDevices()');
			console.log(data);
		};
		this.sendRequest(url, type, {}, fnSuccess, null);
	}

	static populateSelectDevices(arrayDevices) {
		console.log(arrayDevices);
		const selectDevices = $('#selectDevices');
		selectDevices.empty();
		arrayDevices.forEach(device => {
			const option = document.createElement('option');
			option.id = device.id;
			option.innerHTML = device.name;
			if(device.active) {
				option.selected = true;
			}
			selectDevices.append(option);
		});
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
				//console.log(item.album.id);
				let album = new Album(item.album.id, item.album.name);
				// iterate over artists of album
				item.album.artists.forEach(_artist => {
					// test if artist is already in list
					let artistId = this.artists.findIndex(element => element.id === _artist.id);
					if(artistId === -1) { // artist id not found, add new artist
						let artist = new Artist(_artist.id, _artist.name);
						//artist.genres = this.getGenres(_artist.id);
						artist.addAlbum(album);
						this.artists.push(artist);
					} else { // artist id found, add album to existing artist
						//console.log(this.artists[idArtist]);
						this.artists[artistId].addAlbum(album);
					}
				});
			});

			console.log(Math.min(offset + limit, data.total) + '/' + data.total);
			$('#viewStatus').html('Loading ' + Math.min(offset + limit, data.total) + '/' + data.total);

			// test if there are more albums
			if(data.next != null) {
				this.getSavedAlbums(offset + limit, limit);
			} else { // no more albums
				console.log('no more albums');
				// sort artists alphabetically
				this.artists.sort((a, b) => a.name.localeCompare(b.name));
				//console.log(this.artists);

				localStorage.setItem('artists', JSON.stringify(this.artists));
				this.getGenres();
				this.populateViewLibraryFromArtists(this.artists);

				$('#viewStatus').html('');
			}
		}
		this.sendRequest(url, type, data, fnSuccess);
	}

	startPlayback(albumId) {
		let url = 'https://api.spotify.com/v1/me/player/play?device_id=' + $('#selectDevices').children(':selected').attr('id');
		let type = 'PUT';
		let data = JSON.stringify({
			'context_uri': 'spotify:album:' + albumId,
			'position_ms': 0,
		});
		let fnSuccess = function(data) {
			console.log(data);
		};
		this.sendRequest(url, type, data, fnSuccess);
	}

	populateViewLibraryFromArtists(artists) {
		const ulLibraryNew = document.createElement('ul');
		ulLibraryNew.id = 'ulLibrary';
		artists.forEach(artist => {
			let ulAlbums = document.createElement('ul');
			ulAlbums.classList.add('nested');

			let liArtist = document.createElement('li');
			/*liArtist.classList.add('caret');
			liArtist.classList.add('expandable');*/

			let spanArtistName = document.createElement('span');
			spanArtistName.innerHTML = artist.name;
			spanArtistName.id = artist.id;
			spanArtistName.classList.add('caret');

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
				console.log('addEventListener call');
				ulAlbums.classList.toggle('active');
				spanArtistName.classList.toggle('expandable');
				spanArtistName.classList.toggle('collapsable');
			});

			liArtist.append(spanArtistName);
			ulLibraryNew.appendChild(liArtist);

			// sort albums (Todo: different location?)
			artist.albums.sort((a, b) => a.name.localeCompare(b.name));

			artist.albums.forEach((album) => {
				let liAlbum = document.createElement('li');
				liAlbum.innerHTML = album.name;
				liAlbum.addEventListener('click', () => {
					this.startPlayback(album.id);
				});
				ulAlbums.appendChild(liAlbum);
			})
			liArtist.appendChild(ulAlbums);
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

	refreshAccessToken(refreshToken) {
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
		};
		let fnError = function(error) {
			console.error('Error:', error);
			//Utils.logout();
		}
		this.sendRequest(url, type, data, fnSuccess, fnError);
	}
}