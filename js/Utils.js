class Utils {

    static login(access_token) {
        console.debug('login()');
        $('#preLogin').hide();
        $('#postLogin').show();
        $('#buttonStartTutorial').show();


        const options = new Options();
        const library = new Library();
        const statusManager = new StatusManager($('#viewStatus'));
        const stateManager = new StateManager(library, options);
        const spotify = new Spotify(library, options, statusManager);
        const libraryRenderer = new LibraryRenderer(spotify, library, options, stateManager);

        // debug reasons only:
        window.sptf = spotify;
        window.lRenderer = libraryRenderer;

        library.addUpdateListener(stateManager.saveToLocalStorage.bind(stateManager));

        library.addUpdateListener(libraryRenderer.populateSelectViewBy.bind(libraryRenderer));
        library.addUpdateListener(libraryRenderer.populateSelectSortAlbumsBy.bind(libraryRenderer));

        library.addUpdateListener(libraryRenderer.populateClusterGenres.bind(libraryRenderer));
        library.addUpdateListener(libraryRenderer.populateViewLibrary.bind(libraryRenderer));

        spotify.addUpdateListener(libraryRenderer.populateSelectDevices.bind(libraryRenderer));

        // we need to call this when all the update listeners have been added
        stateManager.loadFromLocalStorage(true);


        libraryRenderer.bindButtons();
        libraryRenderer.bindContextmenu();
        libraryRenderer.bindOthers();

        spotify.accessToken = new AccessToken(access_token, 'Bearer');
        spotify.getDevices();

        // remove parameters from url
        window.history.replaceState(null, '', window.location.pathname);
    }

    static logout() {
        console.debug('logout()');
        localStorage.clear();
        $('#preLogin').show();
        $('#postLogin').hide();
        $('#buttonStartTutorial').hide();
    }

    static replacerTreeFlat(key, value) {
        /*
        if(value instanceof TreeNode) {
            return {
                dataType: value.dataType,
                uniqueId: value.uniqueId,
                children: value.children.map(_child => ({dataType: _child.dataType, uniqueId: _child.uniqueId}))
            };
        }*/
        // replace children objects by their dataType and uniqueId to save space
        // todo: maybe dataType can be omitted
        if (key === 'children') {
            //console.log(value);

            return value.map(_child => {
                if (_child !== undefined) {
                    return {uniqueId: _child.uniqueId}
                } else {
                    return {uniqueId: 0}
                }
            });

            //return value.map(_child => ({uniqueId: _child.uniqueId}));
        }
        // remove artists and albums since they are stored in children, too
        if (key === 'artists' || key === 'albums') {
            return undefined;
        }
        return value;
    }

    static reviverTreeFlat(key, value) {
        //console.log(key);
        //console.log(value);
        if (typeof value === 'object' && value !== null) {

            switch (value.dataType) {
                case TreeNode.name:
                    let treeNode = new TreeNode(value.id, value.name);
                    this.oldNewUniqueId.set(value.uniqueId, treeNode);
                    treeNode.children = JSON.parse(JSON.stringify(value.children), Utils.reviverUniqueIds);
                    return treeNode;
                case Folder.name:
                    //console.log('got folder');
                    if (value.name !== undefined && value.name !== null) {
                        let folder = new Folder(value.id, value.name);
                        folder.children = JSON.parse(JSON.stringify(value.children), Utils.reviverUniqueIds);
                        this.oldNewUniqueId.set(value.uniqueId, folder);
                        //console.log(folder);
                        return folder;
                    }
                    return undefined;
                case Genre.name:
                    if (value.name !== undefined && value.name !== null) {
                        let genre = new Genre(value.name);
                        this.oldNewUniqueId.set(value.uniqueId, genre);
                        genre.children = JSON.parse(JSON.stringify(value.children), Utils.reviverUniqueIds);
                        return genre;
                    }
                    return undefined;
                case Artist.name:
                    if (value.name !== undefined && value.name !== null) {
                        let artist = new Artist(value.id, value.name);
                        this.oldNewUniqueId.set(value.uniqueId, artist);
                        artist.children = JSON.parse(JSON.stringify(value.children), Utils.reviverUniqueIds);
                        return artist;
                    }
                    return undefined;
                case Album.name:
                    if (value.name !== undefined && value.name !== null) {
                        let album = new Album(value.id, value.name, value.releaseDate, value.releaseDatePrecision);
                        this.oldNewUniqueId.set(value.uniqueId, album);
                        return album;
                    }
                    return undefined;
            }
        }
        return value;
    }

    static reviverUniqueIds(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (value.uniqueId !== undefined && value.uniqueId !== null) {
                //console.log(value.uniqueId);
                //console.log(this.oldNewUniqueId.get(value.uniqueId));
                //return this.oldNewUniqueId.get(value.uniqueId);
                return value.uniqueId;
            }
        }
        return value;
    }

    static reviverOptions(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (value.dataType === Options.name) {
                let options = new Options();
                options.view = value.view;
                options.sortAlbums = value.sortAlbums;
                options.selectedDevice = value.selectedDevice;
                return options;
            }
        }
        return value;
    }

    static sortByName(a, b) {
        return a.name.localeCompare(b.name);
    }

    static sortByNameDesc(a, b) {
        return b.name.localeCompare(a.name);
    }

    static sortByYear(a, b) {
        return new Date(a.releaseDate) < new Date(b.releaseDate) ? -1 : 1;
    }

    // filter for arrays to retrieve unique values only
    static onlyUnique(value, index, array) {
        return array.indexOf(value) === index;
    }
}

// case insensitive filter
jQuery.expr[':'].icontains = function (a, i, m) {
    return jQuery(a).text().toUpperCase()
        .indexOf(m[3].toUpperCase()) >= 0;
};


// generate unique ids for objects
const uniqueId = (() => {
    let currentId = 0;
    const map = new WeakMap();

    return (object) => {
        //console.log(map)
        if (!map.has(object)) {
            map.set(object, ++currentId);
        }

        return map.get(object);
    };
})();