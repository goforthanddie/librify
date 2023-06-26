window.addEventListener("load", () => {
	let spotify = new Spotify();
	// debug reasons only:
	window.sptf = spotify;

	spotify.libraryRenderer.populateSelectViewBy();
	spotify.libraryRenderer.populateSelectSortAlbumsBy();
	spotify.libraryRenderer.bindButtons();
	spotify.libraryRenderer.bindSearch();

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
