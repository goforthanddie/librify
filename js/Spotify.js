class Spotify {
    constructor() {
        this.accessToken = null;
        this.arrayLibrary = new Map();
        this.arrayLibraryDescriptive = new Map();
        this.arrayArtistIdName = new Map();
        this.arrayAlbumIdName = new Map();
        this.arrayGenres = new Array();
        this.arrayDevices = new Array();
    }

    getAccessToken() { // aktualisieren mit neuer methode
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
            success: function(data) {
                console.log(this);
                this.accessToken = new AccessToken(data.access_token, data.token_type, data.expires_in);
                console.log(this);
                this.getSavedAlbums(0, 50);
                //console.log(data);
                //console.log(this.accessToken);
            }
        });
    }

    getDevices() {
        $.ajax({
            url: 'https://api.spotify.com/v1/me/player/devices',
            type: 'GET',
            context: this,
            headers: {
                'Authorization': this.accessToken.type + '  ' + this.accessToken.token
            },
            success: function(data) {
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
        console.log('getSavedAlbums('+offset+','+limit+')');
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
            success: function(data) {
                console.log(data);
                console.log(this.arrayAlbumIdName);
                // iterate over returned albums
                data.items.forEach(item => {
                    this.arrayAlbumIdName.set(item.album.id, item.album.name);
                    // iterate over artists of album
                    item.album.artists.forEach(artist => {
                        this.arrayArtistIdName.set(artist.id, artist.name);
                        if (!this.arrayLibrary.has(artist.id)) {
                            //console.log(itemb.id + ' not existing in arrayLibrary');
                            this.arrayLibrary.set(artist.id, new Map());
                        } else {
                            //console.log(itemb.id + ' existing in arrayLibrary');
                        }
                        this.arrayLibrary.get(artist.id).set(item.album.id, item.album.name);
                    });

                    // iterate over genres of album
                    item.album.genres.forEach(genre => {
                        this.arrayGenres.push(genre);
                        if(!this.arrayGenres.includes(genre)) {
                            this.arrayGenres.push(genre);
                        }
                    });
                });

                // test if there are more albums
                if(data.next != null) {
                    this.getSavedAlbums(offset+limit, limit);
                } else { // no more albums
                    this.arrayLibraryDescriptive = Spotify.getArrayLibraryDescriptive(this.arrayLibrary, this.arrayArtistIdName, this.arrayAlbumIdName);
                    localStorage.setItem('arrayLibraryDescriptive', JSON.stringify(this.arrayLibraryDescriptive));
                    this.populateViewLibrary(this.arrayLibraryDescriptive);
                }
                console.log(this.arrayAlbumIdName);
                console.log(this.arrayArtistIdName);
                console.log(this.arrayLibrary);
                console.log(this.arrayGenres);

            }
        });
    }

    startPlayback(albumId) {
        $.ajax({
            url: 'https://api.spotify.com/v1/me/player/play?device_id='+$('#selectDevices').children(':selected').attr('id'),
            type: 'PUT',
            context: this,
            data:
                JSON.stringify({
                'context_uri': 'spotify:album:'+albumId,
                'position_ms': 0,

            }),
            headers: {
                'Authorization': this.accessToken.type + '  ' + this.accessToken.token
            },
            success: function(data) {
                console.log(data);
            }
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

            spanArtistName.addEventListener('click',() => {
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
        const sortStringValues = ([,a], [,b]) => String(a).localeCompare(b);

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