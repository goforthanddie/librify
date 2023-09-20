window.addEventListener("load", () => {
    $(document).click(function () {
        $('#contextmenu').css({display: 'none'}); // hide contextmenu on left click
    });

    /*
    document.addEventListener('contextmenu', () => {
        //console.log('contextmenu')
        //let contextmenu = $('#contextmenu');
        //contextmenu.css({ display: 'none' });//Hide the menu
    });
*/

    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');
    let access_token = localStorage.getItem('access_token');

    // test if there is a code, meaning we got redirected from spotify auth page and no access_token
    if (code && access_token == null) {
        console.log('access_token == null');
        const statusManager = new StatusManager($('#viewStatusPreLogin'));
        const spotify = new Spotify(new Library(), new Options(), statusManager);
        spotify.getAccessToken(code);
    } else if (access_token != null) {
        console.log('access_token != null');
        Utils.login(access_token);
    } else {
        console.log('Showing pre-login page.');
    }

    $('#buttonLogin').click(() => {
        Spotify.authorize();
    });


});
