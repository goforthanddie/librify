// Listeners
window.addEventListener("load", () => {
	let spotify = new Spotify();
	// debug reasons only:
	window.sptf = spotify;

	const urlParams = new URLSearchParams(window.location.search);
	let code = urlParams.get('code');
	let access_token = localStorage.getItem('access_token');

	// test if there is a code, meaning we got redirected from spotify auth page and no access_token
	if(code && access_token == null) {
		spotify.getAccessToken(code);
	} else if(access_token != null) {
		console.log('access_token != null');
		Utils.login(spotify, access_token);
	} else {
		console.log('something went seriously wrong :<');
	}

	$('#buttonUpdateLibrary').click(function() {
		$(this).attr('disabled', true);
		//console.log(spotify.library.genres);
		spotify.getSavedAlbums(0, 50);
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

	$('#buttonManageGenres').click(function() {
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
		console.debug('inside selectSortAlbums');
		spotify.library.notifyUpdateListeners();
	});

	let selectView = $('#selectView');
	selectView.append($('<option />').val(VIEW_ARTIST).text(VIEW_ARTIST));
	selectView.append($('<option />').val(VIEW_GENRE).text(VIEW_GENRE));

	// preselect default option
	$('#selectView > option[value=' + spotify.options.view + ']').attr('selected', 'selected');

	selectView.change(function() {
		spotify.options.view = selectView.children(':selected').attr('value');
		console.debug('inside selectView');
		spotify.library.notifyUpdateListeners();
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
		Spotify.authorize();
	});

	$('#buttonRedo').click(() => {
		$(this).attr('disabled', true);
		spotify.library.stateManager.redo();
		$(this).attr('disabled', false);
	});

	$('#buttonUndo').click(() => {
		$(this).attr('disabled', true);
		//console.log('#buttonUndo.click() in if currentStateIdx=' + spotify.library.stateManager.currentStateIdx);
		spotify.library.stateManager.undo();
		$(this).attr('disabled', false);
	});

	$('#buttonSaveData').click(function() {
		$(this).attr('disabled', true);
		let data = "data:text/json;charset=utf-8," + encodeURIComponent('{"genres": ' + spotify.library.stateManager.getCurrentState().genres + ', "artists":' + spotify.library.stateManager.getCurrentState().artists + '}');
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
			spotify.library.stateManager.loadFromFile(input.files[0]);
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
		spotify.statusManager.setStatusText('Removed ' + numRemovedGenres + ' empty genre(s).');
		$(this).attr('disabled', false);
	});
});
