const clientId = 'f77bc91de5834f398680d65c02bdfe94';
const redirectUri = 'https://librify.coderbutze.de';
//const redirectUri = 'http://localhost:63342/SpotifyTree/index.html';

class Spotify {

    artists;

    constructor() {
        let artists = localStorage.getItem('artists');
        if(artists != null) {
            console.log('populating library view from stored artists');
            this.artists = JSON.parse(artists, Utils.reviver);
            this.populateViewLibraryFromArtists(this.artists);
        } else {
            this.artists = new Array();
        }
        this.accessToken = null;
        this.arrayGenres = new Array();
        this.arrayDevices = new Array();
    }

    getAccessTokenOld() { // aktualisieren mit neuer methode
        $.ajax({
            url: 'https://accounts.spotify.com/api/token',
            type: 'POST',
            context: this,
            data: {
                //'grant_type': 'client_credentials',
                'response_type': 'token',
                'client_id': 'f77bc91de5834f398680d65c02bdfe94',
                'scope': '',
                'redirect_uri': 'http://localhost:63342/SpotifyTree/index.html',
                'state': ''
                //'client_secret': 'b99d199fb18d461b8828cf0f9205c455'
            },
            success: function (data) {
                console.log(this);
                this.accessToken = new AccessToken(data.access_token, data.token_type, data.expires_in);
                console.log(this);
                this.getSavedAlbums(0, 50);
                //console.log(data);
                //console.log(this.accessToken);
            }
        });
    }

    getDevices() { // Todo: create object class
        $.ajax({
            url: 'https://api.spotify.com/v1/me/player/devices',
            type: 'GET',
            context: this,
            headers: {
                'Authorization': this.accessToken.type + '  ' + this.accessToken.token
            },
            success: function (data) {
                this.arrayDevices = data.devices;
                Spotify.populateSelectDevices(this.arrayDevices);
                console.log('getDevices()');
                console.log(data);
            }
        });
    }

    static populateSelectDevices(arrayDevices) {
        arrayDevices.forEach(device => {
            const option = document.createElement('option');
            option.id = device.id;
            option.innerHTML = device.name;
            document.getElementById('selectDevices').appendChild(option);
        });
    }

    getSavedAlbums(offset = 0, limit = 50) {
        console.log('getSavedAlbums(' + offset + ',' + limit + ')');
        //console.log(this);
        //console.log(this.accessToken);
        $.ajax({
            url: 'https://api.spotify.com/v1/me/albums',
            type: 'GET',
            context: this,
            data: {
                'limit': limit,
                'offset': offset
            },
            headers: {
                'Authorization': this.accessToken.type + '  ' + this.accessToken.token
            },
            success: function (data) {
                //console.log(data);
                // iterate over returned albums
                data.items.forEach(item => {
                    //console.log(item.album.id);
                    let album = new Album(item.album.id, item.album.name);
                    // iterate over artists of album
                    item.album.artists.forEach(_artist => {
                        // test if artist is already in list
                        let idArtist = this.artists.findIndex(element => element.id == _artist.id);
                        if (idArtist == -1) { // artist id not found, add new artist
                            let artist = new Artist(_artist.id, _artist.name);
                            artist.addAlbum(album);
                            this.artists.push(artist);
                        } else { // artist id found, add album to existing artist
                            //console.log(this.artists[idArtist]);
                            this.artists[idArtist].addAlbum(album);
                        }
                    });

                    // iterate over genres of album
                    item.album.genres.forEach(genre => {
                        this.arrayGenres.push(genre);
                        if (!this.arrayGenres.includes(genre)) {
                            this.arrayGenres.push(genre);
                        }
                    });
                });

                console.log(Math.min(offset+limit, data.total) + '/' + data.total);
                $('#viewStatus').html('Loading ' + Math.min(offset+limit, data.total) + '/' + data.total);

                // test if there are more albums
                if (data.next != null) {
                    this.getSavedAlbums(offset + limit, limit);
                } else { // no more albums
                    console.log('no more albums');
                    this.artists.sort((a, b) => a.name.localeCompare(b.name));
                    console.log(this.artists);

                    localStorage.setItem('artists', JSON.stringify(this.artists));
                    this.populateViewLibraryFromArtists(this.artists);

                    $('#viewStatus').html('');
                }
                //console.log(this.arrayAlbumIdName);
                //console.log(this.arrayArtistIdName);
                //console.log(this.arrayLibrary);
                //console.log(this.arrayGenres);

            }
        });
    }

    startPlayback(albumId) {
        $.ajax({
            url: 'https://api.spotify.com/v1/me/player/play?device_id=' + $('#selectDevices').children(':selected').attr('id'),
            type: 'PUT',
            context: this,
            data:
                JSON.stringify({
                    'context_uri': 'spotify:album:' + albumId,
                    'position_ms': 0,

                }),
            headers: {
                'Authorization': this.accessToken.type + '  ' + this.accessToken.token
            },
            success: function (data) {
                console.log(data);
            }
        });
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
            let existingSpanArtistName = $('span#'+artist.id);
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
        $('#divLibrary').empty();
        $('#divLibrary').append(ulLibraryNew);
    }

    /**
     * Generates a random string containing numbers and letters
     * @param  {number} length The length of the string
     * @return {string} The generated string
     */
    static generateRandomString(length) {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
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

        let body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier
        });
        const response = fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        }).then(response => {
            if (!response.ok) {
                throw new Error('HTTP status ' + response.status);
            }
            return response.json();
        }).then(data => {
            console.log('data');
            console.log(data);

            localStorage.setItem('access_token', data.access_token);
            loginOk(this, data.access_token);
        }).catch(error => {
            console.error('Error:', error);
            $('#login').show();
            $('#loggedin').hide();
        });
    }

    populateViewLibrary(arrayLibraryDescriptive) {
        const ulLibrary = document.getElementById('ulLibrary');
        ulLibrary.innerHTML = '';
        arrayLibraryDescriptive.forEach((arrayAlbums, artistName) => {
            let ulAlbums = document.createElement('ul');
            ulAlbums.className = 'nested';

            let liArtist = document.createElement('li');
            /*liArtist.classList.add('caret');
            liArtist.classList.add('expandable');*/

            let spanArtistName = document.createElement('span');
            spanArtistName.innerHTML = artistName;
            spanArtistName.classList.add('caret');
            spanArtistName.classList.add('expandable');

            spanArtistName.addEventListener('click', () => {
                ulAlbums.classList.toggle('active');
                spanArtistName.classList.toggle('expandable');
                spanArtistName.classList.toggle('collapsable');
            });

            liArtist.append(spanArtistName);
            ulLibrary.appendChild(liArtist);

            arrayAlbums.forEach((albumName, albumId) => {
                let liAlbum = document.createElement('li');
                liAlbum.innerHTML = albumName;
                liAlbum.addEventListener('click', () => {
                    this.startPlayback(albumId);
                });
                ulAlbums.appendChild(liAlbum);
            })
            liArtist.appendChild(ulAlbums);
        });
    }

    static getArrayLibraryDescriptive(arrayLibrary, arrayArtistIdName, arrayAlbumIdName) {
        const sortStringKeys = ([a], [b]) => String(a).localeCompare(b);
        const sortStringValues = ([, a], [, b]) => String(a).localeCompare(b);

        const arrayLibraryDescriptive = new Map();
        // sort arrayArtistIdName alphabetically
        const arrayArtistIdNameSorted = new Map([...arrayArtistIdName].sort(sortStringValues));
        console.log(arrayArtistIdNameSorted);
        arrayArtistIdNameSorted.forEach((artistName, artistId) => {
            // sort each map with albums alphabetically after value
            arrayLibraryDescriptive.set(artistName, new Map([...arrayLibrary.get(artistId)].sort(sortStringValues)));
        });

        //arrayLibraryDescriptive = new Map([...arrayLibrary].sort(sortString));
        console.log('arrayLibraryDescriptive=');
        console.log(arrayLibraryDescriptive);
        return arrayLibraryDescriptive;
    }
}