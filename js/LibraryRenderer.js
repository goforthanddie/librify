class LibraryRenderer {

	spotify;
	library;
	options;
	stateManager;

	dragged;

	constructor(spotify, library, options, stateManager) {
		if(spotify !== null && spotify !== undefined) {
			this.spotify = spotify;
		} else {
			console.debug('got no spotify object.');
		}

		if(library !== null && library !== undefined) {
			this.library = library;
		} else {
			console.debug('got no library object.');
		}

		if(options !== null && options !== undefined) {
			this.options = options;
		} else {
			console.debug('got no options object.');
		}

		if(stateManager !== null && stateManager !== undefined) {
			this.stateManager = stateManager;
		} else {
			console.debug('got no stateManager object.');
		}
	}

	populateViewLibrary() {
		console.debug('populateViewLibrary()');

		if(this.options.view === VIEW_ARTIST && this.library.artists !== null) {
			this.populateViewLibraryByArtists(this.library.artists);
		} else if(this.options.view === VIEW_GENRE && this.library.genres !== null) {
			this.populateViewLibraryByGenres(this.library.genres);
		} else if(this.options.view === VIEW_TREE && this.library.tree !== null) {
			// todo: cleanup
			let rootNode = new TreeNode('root', 'root');
			rootNode.children = this.library.genres;
			console.log(rootNode);
			rootNode.toggleExpanded();
			this.library.tree = rootNode;
			this.library.treeFlat = TreeNode.getAllChildren(rootNode);
			this.populateViewLibraryByTree(this.library.tree);
		}

		this.filterViewLibrary();

		$('div#viewStats').text('Holding: ' + this.library.genres.length + ' Genres, ' + this.library.artists.length + ' Artists, ' + this.library.getNumAlbums() + ' Albums');
	}

	populateViewLibraryByArtists(artists) {
		console.debug('populateViewLibraryByArtists()');
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

	populateViewLibraryByGenres(genres) {
		console.debug('populateViewLibraryByGenres()');
		if(genres === null) {
			console.debug('genres === null')
			return false;
		}

		const ulLibraryNew = document.createElement('ul');
		ulLibraryNew.id = 'ulLibrary';

		//console.log(genres);
		for(let i = 0, I = genres.length; i < I; i++) {
			let genre = genres[i];
			let ulArtists = this.generateUlFromArtists(genre.artists);
			ulArtists.classList.add('inactive');

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
				}
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


	populateViewLibraryByTree(treeNode) {
		console.debug('populateViewLibraryByTree()');
		if(treeNode === null) {
			console.debug('tree === null')
			return false;
		}

		const ulLibraryNew = this.generateUlFromTreeNodes(treeNode.children, true);

		// switch content of old ul to new ul because we need to keep the expanded items expanded
		const divLibrary = $('#divLibrary');
		divLibrary.empty();
		divLibrary.append(ulLibraryNew);
	}

	makeDropTarget(element) {
		// highlight the potential target
		element.addEventListener('dragenter', (event) => {
			event.target.classList.add('highlight');
		});

		element.addEventListener('dragleave', (event) => {
			event.target.classList.remove('highlight');
		});

		element.addEventListener('dragover', (event) => {
			// prevent default to allow drop
			event.preventDefault();
		});

		element.addEventListener('drop', (event) => {
			event.target.classList.remove('highlight');
			console.log(this.dragged.id + ' has been dropped into ' + event.target.objRef.id);

			// find parent node of dragged element
			let parentNode = this.library.treeFlat .find(_node => _node.children.find(_child => _child.uniqueId === this.dragged.uniqueId) !== undefined);
			console.log(parentNode);

			// test if the target is dragged into its old parent node
			if(parentNode.uniqueId !== event.target.objRef.uniqueId) {

				// add dragged node as child to target node
				event.target.objRef.addChild(this.dragged);

				// remove dragged node from parent node
				parentNode.removeChild(this.dragged);

				this.library.notifyUpdateListeners();
			}

		});
	}

	makeDraggable(element) {
		element.draggable = true;
		element.addEventListener('dragstart', (event) => {
			this.dragged = event.target.objRef;
		});
	}

	generateUlFromTreeNodes(nodes, parentExpanded) {
		const fragment = new DocumentFragment();
		const ul = document.createElement('ul');

		if(parentExpanded) {
			ul.classList.add('active');
		} else {
			ul.classList.add('inactive');
		}

		for(let i = 0, I = nodes.length; i < I; i++) {
			const li = document.createElement('li');

			if(nodes[i].visible) {
				li.classList.add('active');
			} else {
				li.classList.add('inactive');
			}

			const spanName = document.createElement('span');
			//spanName.classList.add(level);
			li.append(spanName);

			spanName.id = nodes[i].id;
			// add a reference to the object for drag&drop
			spanName.objRef = nodes[i];
			spanName.innerText = nodes[i].getInnerText();

			this.makeDraggable(spanName);

			switch(true) {
				case nodes[i] instanceof Album:
					spanName.classList.add('caret');
					spanName.addEventListener('click', () => {
						this.spotify.startPlayback(nodes[i].id);
					});
					break;
				default:
					if(nodes[i].expanded) {
						spanName.classList.add('collapsable');
					} else {
						spanName.classList.add('expandable');
					}
					// sort albums for visualization
					if(this.options.sortAlbums === SORT_BY_YEAR) {
						nodes[i].children.sort((a, b) => new Date(a.releaseDate) < new Date(b.releaseDate) ? -1 : 1);
					} else {
						nodes[i].children.sort((a, b) => a.name.localeCompare(b.name));
					}
					this.makeDropTarget(spanName);
			}

			if(nodes[i].children.length > 0) {
				const ulChildren = this.generateUlFromTreeNodes(nodes[i].children, nodes[i].expanded);
				li.append(ulChildren);
				spanName.classList.add('caret');
				spanName.addEventListener('click', () => {
					spanName.objRef.toggleExpanded();
					ulChildren.classList.toggle('active');
					ulChildren.classList.toggle('inactive');
					spanName.classList.toggle('expandable');
					spanName.classList.toggle('collapsable');
				});
			}
			fragment.append(li);
		}
		ul.append(fragment);

		return ul;
	}

	filterTree(keyword) {
		this.library.treeFlat.map(_child => {
			_child.setVisible(_child.name.toLowerCase().includes(keyword));
		});
		this.populateViewLibrary();
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


	populateSelectDevices() {
		console.debug('populateSelectedDevices()');
		let arrayDevices = this.spotify.arrayDevices;
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

	populateSelectViewBy() {
		console.debug('populateSelectViewBy()');
		let selectView = $('#selectView');
		selectView.empty();
		selectView.append($('<option />').val(VIEW_ARTIST).text(VIEW_ARTIST));
		selectView.append($('<option />').val(VIEW_GENRE).text(VIEW_GENRE));
		selectView.append($('<option />').val(VIEW_TREE).text(VIEW_TREE));

		$('#selectView > option[value=' + this.options.view + ']').attr('selected', 'selected');
	}

	populateSelectSortAlbumsBy() {
		console.debug('populateSelectSortAlbumsBy()');
		let selectSortAlbums = $('#selectSortAlbums');
		selectSortAlbums.empty();
		selectSortAlbums.append($('<option />').val(SORT_BY_NAME).text(SORT_BY_NAME));
		selectSortAlbums.append($('<option />').val(SORT_BY_YEAR).text(SORT_BY_YEAR));

		$('#selectSortAlbums > option[value=' + this.options.sortAlbums + ']').attr('selected', 'selected');
	}

	bindButtons() {
		{
			let button = $('#buttonUpdateLibrary');
			button.on('click', () => {
				button.attr('disabled', true);
				this.spotify.getSavedAlbums(0, 50);
			});
		}

		{
			let button = $('#buttonReduceGenres');
			button.on('click', () => {
				this.spotify.statusManager.setStatusText('Reducing genres...');
				button.attr('disabled', true);

				let numReduced = this.library.reduceGenres();
				if(numReduced === 0) {
					this.spotify.statusManager.setStatusText('Genres could not be reduced further.');
				} else {
					this.spotify.statusManager.setStatusText('Reduced the number of genres by ' + numReduced + '.');
				}
				button.attr('disabled', false);
			});
		}

		$('#buttonManageGenres').on('click', () => {
			$('#viewManageGenres').toggle()
		});

		{
			let button = $('#buttonStoreGenresSub');
			button.on('click', () => {
				this.spotify.statusManager.setStatusText('Reducing genres...');
				button.attr('disabled', true);
				let numReduced = this.library.clusterGenres();
				if(numReduced === 0) {
					this.spotify.statusManager.setStatusText('Genres could not be reduced further.');
				} else {
					this.spotify.statusManager.setStatusText('Reduced the number of genres by ' + numReduced + '.');
				}
			});
		}

		{
			let button = $('#buttonReloadDevices');
			button.on('click', () => {
				button.attr('disabled', true);
				this.spotify.getDevices();
			});
		}

		$('#buttonLogout').on('click', () => {
			Utils.logout();
		});

		{
			let button = $('#buttonUndo');
			button.on('click', () => {
				button.attr('disabled', true);
				this.stateManager.undo();
			});
		}

		{
			let button = $('#buttonRedo');
			button.on('click', () => {
				button.attr('disabled', true);
				this.stateManager.redo();
			});
		}

		{
			let button = $('#buttonSaveData');
			button.on('click', () => {
				button.attr('disabled', true);
				let currentState = this.stateManager.getCurrentState();
				let data = "data:text/json;charset=utf-8," + encodeURIComponent('{"genres": ' + currentState.genres + ', "artists":' + currentState.artists + ', "options": ' + currentState.options + '}');
				let aSaveData = document.getElementById('aSaveData');
				aSaveData.href = data;
				aSaveData.download = 'librify.json';
				aSaveData.click();
				button.attr('disabled', false);
			});
		}

		{
			let button = $('#buttonLoadData');
			button.on('click', () => {
				button.attr('disabled', true);
				let input = document.createElement('input');
				input.type = 'file';
				input.onchange = () => {
					this.stateManager.loadFromFile(input.files[0]);
					button.attr('disabled', false);
				}
				input.click();
			});
		}


		$('#buttonClusterGenres').on('click', () => {
			$('#fieldsetClusterGenres').toggle();
			this.populateClusterGenres();
		});

		{
			let button = $('#buttonAddGenre');
			button.on('click', () => {
				button.attr('disabled', true);
				let inputGenreName = $('input#addGenre');
				let genreName = inputGenreName.val();
				if(this.library.addGenreByName(genreName)) {
					this.spotify.statusManager.setStatusText('Added new genre "' + genreName + '".');
				} else {
					this.spotify.statusManager.setStatusText('Did not add genre "' + genreName + '", possible duplicate.');
				}
				inputGenreName.val('');
				button.attr('disabled', false);
			});
		}

		{
			let button = $('#buttonRemoveEmptyGenres');
			button.on('click', () => {
				button.attr('disabled', true);
				let numRemovedGenres = this.library.removeEmptyGenres();
				this.spotify.statusManager.setStatusText('Removed ' + numRemovedGenres + ' empty genre(s).');
				button.attr('disabled', false);
			});
		}
	}

	bindOthers() {
		$('input#searchKeyword').on('input', () => {
			this.filterViewLibrary();
			this.filterTree($('input#searchKeyword').val());
		});

		$('#selectDevices').on('change', () => {
			this.options.selectedDevice = $('#selectDevices').children(':selected').attr('id');
		});

		$('#selectView').on('change', () => {
			this.options.view = $('#selectView').children(':selected').attr('value');
			this.library.notifyUpdateListeners();
		});

		$('#selectSortAlbums').on('change', () => {
			this.options.sortAlbums = $('#selectSortAlbums').children(':selected').attr('value');
			this.library.notifyUpdateListeners();
		});
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

			let ulAlbums = document.createElement('ul');
			ulAlbums.id = 'ulLibrary';
			ulAlbums.classList.add('inactive');

			let liArtist = document.createElement('li');
			liArtist.classList.add('caret');

			let spanArtistName = document.createElement('span');
			spanArtistName.textContent = artist.name;
			spanArtistName.id = artist.id;
			spanArtistName.classList.add('caret', 'artist');
			spanArtistName.draggable = true;

			// test if span already exists
			let existingSpanArtistName = document.getElementById(artist.id);
			if(existingSpanArtistName !== null && existingSpanArtistName.classList.contains('collapsable')) {
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

			// sort albums for visualization
			if(this.options.sortAlbums === SORT_BY_YEAR) {
				artist.albums.sort((a, b) => new Date(a.releaseDate) < new Date(b.releaseDate) ? -1 : 1);
			} else {
				artist.albums.sort((a, b) => a.name.localeCompare(b.name));
			}

			let fragmentAlbums = document.createDocumentFragment();
			for(let j = 0, J = artist.albums.length; j < J; j++) {

				let album = artist.albums[j];
				let liAlbum = document.createElement('li');
				let spanAlbum = document.createElement('span');
				spanAlbum.classList.add('album');
				spanAlbum.innerText = new Date(album.releaseDate).getFullYear() + ' ' + album.name;
				spanAlbum.addEventListener('click', () => {
					this.spotify.startPlayback(album.id);
				});
				liAlbum.appendChild(spanAlbum);
				fragmentAlbums.appendChild(liAlbum);
			}
			ulAlbums.appendChild(fragmentAlbums);
			liArtist.appendChild(ulAlbums);

		}
		ulLibraryNew.appendChild(fragment);
		return ulLibraryNew;
	}

	filterViewLibrary() {
		console.debug('filterViewLibrary()');

		// apply filter
		let keyword = $('input#searchKeyword').val();

		// select only the not inactive lis
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
