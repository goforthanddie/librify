window.addEventListener("load", () => {
	const options = new Options();
	const statusManager = new StatusManager($('#viewStatus'));
	const library = new Library();
	const stateManager = new StateManager(library, options);
	const spotify = new Spotify(statusManager, options, library);
	const libraryRenderer = new LibraryRenderer(spotify, library, options, stateManager);

	library.addUpdateListener(stateManager.saveToLocalStorage.bind(stateManager));

	spotify.addUpdateListener(libraryRenderer.populateSelectDevices.bind(libraryRenderer));
	library.addUpdateListener(libraryRenderer.populateClusterGenres.bind(libraryRenderer));
	library.addUpdateListener(libraryRenderer.populateViewLibrary.bind(libraryRenderer));

	// we need to call this when all the update listeners have been added, so it doesn't work calling it in the constructor of StateManager.js
	stateManager.loadFromLocalStorage(false);
	stateManager.saveCurrentState();

	// debug reasons only:
	window.sptf = spotify;

	libraryRenderer.populateSelectViewBy();
	libraryRenderer.populateSelectSortAlbumsBy();
	libraryRenderer.bindButtons();
	libraryRenderer.bindSearch();

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
		console.log('Showing pre-login page.');
	}
});
