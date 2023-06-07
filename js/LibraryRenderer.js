class LibraryRenderer {

	spotify;
	library;
	options;
	dragged;

	constructor(spotify, library, options) {
		if(spotify !== null) {
			this.spotify = spotify;
		} else {
			console.debug('got no spotify object... using empty Spotify object.');
			this.spotify = new Spotify();
		}

		if(library !== null) {
			this.library = library;
		} else {
			console.debug('got no library object... using empty Library object.');
			this.library = new Library();
		}

		if(options !== null) {
			this.options = options;
		} else {
			console.debug('got no options object... using empty Options object.');
			this.options = new Options();
		}
	}

	populateViewLibrary() {
		console.debug('populateViewLibrary()');

		if(this.options.view === VIEW_ARTIST && this.library.artists != null) {
			this.populateViewLibraryFromArtists(this.library.artists);
		} else if(this.options.view === VIEW_GENRE && this.library.genres != null) {
			this.populateViewLibraryFromGenres(this.library.genres);
		}

		this.filterViewLibrary();

		//$('div#viewStats').text('Holding: ' + this.library.genres.length + ' Genres, ' + this.library.artists.length + ' Artists, ' + this.library.artists.reduce((numAlbums, _artist) => numAlbums + _artist.albums.length, 0) + ' Albums');
		$('div#viewStats').text('Holding: ' + this.library.genres.length + ' Genres, ' + this.library.artists.length + ' Artists, ' + this.library.getNumAlbums() + ' Albums');
	}

	populateViewLibraryFromArtists(artists) {
		console.debug('populateViewLibraryFromArtists()');
		if(artists === null) {
			console.debug('artists === null')
			return false;
		}
		const ulLibraryNew = this.generateUlFromArtists(artists);

		// switch content of old ul to new ul because we need to keep the expanded items expanded
		const divLibrary = $('#divLibrary');
		divLibrary.empty();
		divLibrary.append(ulLibraryNew);
	}

	populateViewLibraryFromGenres(genres) {
		console.debug('populateViewLibraryFromGenres()');
		if(genres === null) {
			console.debug('genres === null')
			return false;
		}

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
				event.target.classList.remove('highlight');
				//console.log(this.dragged);
				let newGenreId = event.target.id;
				let newGenre = this.library.genres.find(element => element.id === newGenreId);
				//console.log('newGenreId=' + newGenreId);

				// dragging a genre into a genre
				if(typeof this.dragged === 'string') {
					/*
					// add all the artists of the found sub genres to the main genre
					let idGenreSub = this.dragged;
					//console.log('idGenreSub=' + idGenreSub);

					// need the genre index to remove the item from the this.library.genres array
					let genreSubIdx = this.library.genres.findIndex(element => element.id === idGenreSub);
					let genreSub = this.library.genres[genreSubIdx];

					//console.log(this.library.genres[genreSubIdx]);
					if(newGenre !== undefined && genreSubIdx !== -1 && newGenre.id !== genreSub.id) {
						genreSub.artists.forEach(_artist => {
							newGenre.addArtist(_artist);
						});

						// add sub genre to main genre
						//newGenre.addSubGenre(genreSub);

						// remove sub genre from main array
						this.library.genres.splice(genreSubIdx, 1);

						// todo: codeschnipsel kommt häufiger vor
						// sort artists
						newGenre.artists.sort((a, b) => a.name.localeCompare(b.name));

					}
					 */
					let res = this.library.moveArtistsFromGenreToGenre(newGenre, this.dragged);
					if(res.status) {
						console.debug('sub genre ' + res.oldGenreName + ' has been dragged to ' + newGenre.name + '.');
						this.spotify.statusManager.setStatusText('Moved artists from "' + res.oldGenreName + '" to "' + newGenre.name + '".');
					}


				// dragging a single artist into a new genre
				} else if(this.dragged instanceof Array) {
					let res = this.library.moveArtistToGenre(newGenre, this.dragged[0], this.dragged[1]);
					if(res.status) {
						this.spotify.statusManager.setStatusText('Moved artist "' + res.artistName + '" to genre "' + newGenre.name + '".');
						console.log('single artist ' + res.artistName + ' has been dragged to ' + newGenre.name + '.');
					}
					/*
					if(newGenre !== undefined) {
						//console.log('moving to ' + newGenre.id);
						// aus gedraggtem genre entfernen.
						let oldGenreIdx = this.library.genres.findIndex(element => element.id === this.dragged[0]);
						if(oldGenreIdx !== -1) {
							let artistIdx = this.library.genres[oldGenreIdx].artists.findIndex(element => element.id === this.dragged[1]);
							if(artistIdx !== -1) {
								this.library.genres[oldGenreIdx].artists.splice(artistIdx, 1);
							}
						}

						let artist = this.library.artists.find(element => element.id === this.dragged[1]);
						if(artist !== undefined) {
							newGenre.addArtist(artist);
							this.spotify.statusManager.setStatusText('Moved artist "' + artist.name + '" to genre "' + newGenre.name + '".');
							console.log('single artist ' + artist.name + ' has been dragged to ' + newGenreId + '.');
						}
						// todo: codeschnipsel kommt häufiger vor
						// sort artists in genres
						newGenre.artists.sort((a, b) => a.name.localeCompare(b.name));
					}*/
				}
				// store
				//this.library.notifyUpdateListeners();
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

	populateSelectGenresSub() {
		console.debug('populateSelectGenresSub()')
		let selectGenreMain = $('select#genreMain');
		let selectGenresSub = $('select#genresSub');
		let inputGenresSubKeyword = $('input#genresSubKeyword');

		let size = (this.library.genres.length <= 100) ? 10 : Math.ceil(this.library.genres.length / 10);
		selectGenresSub.attr('size', size);
		selectGenresSub.empty();
		let selectedGenreMainValue = selectGenreMain.children(':selected').attr('value');
		this.library.genres.forEach(_genre => {
			//console.log(inputGenresSubKeyword.val());
			if(selectedGenreMainValue !== _genre.id && _genre.name.includes(inputGenresSubKeyword.val())) {
				selectGenresSub.append($('<option />').val(_genre.id).text(_genre.name));
			}
		});
	}

	populateClusterGenres() {
		console.debug('populateClusterGenres()');
		if($('#fieldsetClusterGenres').is(':visible')) {
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


			this.library.genres.forEach(_genre => {
				selectGenreMain.append($('<option />').val(_genre.id).text(_genre.name));
			});

			$('select#genreMain').change(this.populateSelectGenresSub.bind(this));

			$('input#genresSubKeyword').on('input', this.populateSelectGenresSub.bind(this));

			this.populateSelectGenresSub();
		}
	}

	populateSelectDevices(arrayDevices) {
		console.debug('populateSelectedDevices()');
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

		let deviceActive = arrayDevices.find(element => element.active === true);
		if(arrayDevices.length > 0) {
			if(deviceActive === undefined) {
				this.options.selectedDevice = arrayDevices[0].id;
			}
			$('#viewSelectDevicesWithoutButton').show();
		} else {
			$('#viewSelectDevicesWithoutButton').hide();
		}
	}

	generateUlFromArtists(artists) {
		//console.debug('generateUlFromArtists()');
		if(artists === null) {
			console.debug('artists === null')
			return false;
		}
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
					this.spotify.startPlayback(album.id);
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

}
