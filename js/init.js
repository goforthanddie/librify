// Listeners
window.addEventListener("load", () => {
	let spotify = new Spotify();
	// debug reasons only:
	window.sptf = spotify;

	//$('#loggedin').hide();
	//$('#selectDevices').hide();

	const urlParams = new URLSearchParams(window.location.search);
	let code = urlParams.get('code');
	let access_token = localStorage.getItem('access_token');

	// test if there is a code, meaning we got redirected from spotify auth page and no access_token
	if(code && access_token == null) {
		spotify.getAccessToken(code);
	} else if(access_token != null) {
		console.log('access_token != null');
		Utils.login(spotify, access_token);
	}

	$('#buttonUpdateLibrary').click(function() {
		$(this).attr('disabled', true);
		spotify.getSavedAlbums(0, 50);
	});

	$('#buttonGetGenres').click(function() {
		spotify.getGenres(0, 50);
	});

	$('#buttonReduceGenres').click(function() {
		$(this).attr('disabled', true);
		let numReduced = spotify.library.reduceGenres();
		if(numReduced === 0) {
			spotify.statusManager.setStatusText('Genres could not be reduced further.');
		} else {
			spotify.statusManager.setStatusText('Reduced the number of genres by ' + numReduced + '.');
		}
		$(this).attr('disabled', false);
	});

	$('#buttonReduceGenresFurther').click(function() {
		spotify.reduceGenresFurther();
	});

	$('#buttonManageGenres').click(function() {
		// toggle first, because reduceGenresManually only updates when it is visible
		$('#viewManageGenres').toggle();
	});

	$('button#buttonStoreGenresSub').click(() => {
		$('button#buttonStoreGenresSub').attr('disabled', true);
		let numReduced = spotify.library.clusterGenres();
		if(numReduced === 0) {
			spotify.statusManager.setStatusText('Genres could not be reduced further.');
		} else {
			spotify.statusManager.setStatusText('Reduced the number of genres by ' + numReduced + '.');
		}
	});

	let selectSortAlbums = $('#selectSortAlbums');
	selectSortAlbums.append($('<option />').val(SORT_BY_NAME).text(SORT_BY_NAME));
	selectSortAlbums.append($('<option />').val(SORT_BY_YEAR).text(SORT_BY_YEAR));

	// preselect default option
	$('#selectSortAlbums > option[value=' + spotify.options.sortAlbums + ']').attr('selected', 'selected');

	selectSortAlbums.change(function() {
		spotify.options.sortAlbums = selectSortAlbums.children(':selected').attr('value');
		spotify.libraryRenderer.populateViewLibrary();
	});

	let selectView = $('#selectView');
	selectView.append($('<option />').val(VIEW_ARTIST).text(VIEW_ARTIST));
	selectView.append($('<option />').val(VIEW_GENRE).text(VIEW_GENRE));

	// preselect default option
	$('#selectView > option[value=' + spotify.options.view + ']').attr('selected', 'selected');

	selectView.change(function() {
		spotify.options.view = selectView.children(':selected').attr('value');
		spotify.libraryRenderer.populateViewLibrary();
	});

	$('#selectDevices').change(function() {
		spotify.options.selectedDevice = $('#selectDevices').children(':selected').attr('id');
	});

	$('#buttonReloadDevices').click(function() {
		$(this).attr('disabled', true);
		spotify.getDevices();
	});

	$('#buttonLogout').click(function() {
		Utils.logout();
	});

	$('#buttonLogin').click(function() {
		console.log('login-button:click()');
		Spotify.authorize();
	});

	$('#buttonRedo').click(() => {
		$(this).attr('disabled', true);
		spotify.library.stateNavigator.redo();
		$(this).attr('disabled', false);
	});

	$('#buttonUndo').click(() => {
		$(this).attr('disabled', true);
		//console.log('#buttonUndo.click() in if currentStateIdx=' + spotify.library.stateNavigator.currentStateIdx);
		spotify.library.stateNavigator.undo();
		$(this).attr('disabled', false);
	});

	$('#buttonSaveData').click(function() {
		$(this).attr('disabled', true);
		let data = "data:text/json;charset=utf-8," + encodeURIComponent('{"genres": ' + spotify.library.stateNavigator.getCurrentState().genres + ', "artists":' + spotify.library.stateNavigator.getCurrentState().artists + '}');
		let aSaveData = document.getElementById('aSaveData');
		aSaveData.href = data;
		aSaveData.download = 'librify.json';
		aSaveData.click();
		$(this).attr('disabled', false);
	});

	$('#buttonLoadData').click(function() {
		$(this).attr('disabled', true);
		let input = document.createElement('input');
		input.type = 'file';
		input.onchange = () => {
			let file = input.files[0];
			let fr = new FileReader();
			fr.onload = function receivedText() {
				let data = JSON.parse(fr.result);
				if(data.artists !== null) {
					spotify.library.artists = JSON.parse(JSON.stringify(data.artists), Utils.reviverArtists);
				} else {
					console.debug('data.artists === null');
				}
				if(data.genres !== null) {
					spotify.library.genres = JSON.parse(JSON.stringify(data.genres), Utils.reviverGenres.bind(spotify.library.stateNavigator));
				} else {
					console.debug('data.genres === null');
				}
				spotify.library.notifyUpdateListeners();
			};
			fr.readAsText(file);
			$(this).attr('disabled', false);
		}
		input.click();
	});

	$('#buttonClusterGenres').click(function() {
		$('#fieldsetClusterGenres').toggle();
		spotify.libraryRenderer.populateClusterGenres();
	});

	$('input#searchKeyword').on('input', function() {
		spotify.libraryRenderer.filterViewLibrary();
	});

	$('#buttonAddGenre').click(function() {
		$(this).attr('disabled', true);
		let inputGenreName = $('input#addGenre');
		let genreName = inputGenreName.val();
		if(spotify.library.addGenreByName(genreName)) {
			spotify.statusManager.setStatusText('Added new genre "' + genreName + '".');
		} else {
			spotify.statusManager.setStatusText('Did not add genre "' + genreName + '", possible duplicate.');
		}
		inputGenreName.val('');
		$(this).attr('disabled', false);
	});

	$('#buttonRemoveEmptyGenres').click(function() {
		$(this).attr('disabled', true);
		let numRemovedGenres = spotify.library.removeEmptyGenres();
		spotify.statusManager.setStatusText('Removed ' + numRemovedGenres + ' empty genres.');
		$(this).attr('disabled', false);
	});
});
