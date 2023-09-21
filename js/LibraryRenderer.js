class LibraryRenderer {

    spotify;
    library;
    options;
    stateManager;
    searchTimeout;

    // the renderedTree is required, to apply filter operations
    renderedTree;

    dragged;
    rightClicked;

    constructor(spotify, library, options, stateManager) {
        if (spotify !== null && spotify !== undefined) {
            this.spotify = spotify;
        } else {
            console.debug('got no spotify object.');
        }

        if (library !== null && library !== undefined) {
            this.library = library;
        } else {
            console.debug('got no library object.');
        }

        if (options !== null && options !== undefined) {
            this.options = options;
        } else {
            console.debug('got no options object.');
        }

        if (stateManager !== null && stateManager !== undefined) {
            this.stateManager = stateManager;
        } else {
            console.debug('got no stateManager object.');
        }

        this.searchTimeout = 0;
    }

    populateViewLibrary() {
        console.debug('populateViewLibrary()');

        console.debug('this.options.view=' + this.options.view);

        if (this.options.view === VIEW_ARTIST) {
            let rootNode = new TreeNode('root', 'root');
            rootNode.children = this.library.getArtists();
            rootNode.setExpanded(true);

            this.populateViewLibraryByTree(new Tree(rootNode));
        } else if (this.options.view === VIEW_GENRE) {
            let rootNode = new TreeNode('root', 'root');
            rootNode.children = this.library.getGenres();
            rootNode.setExpanded(true);

            this.populateViewLibraryByTree(new Tree(rootNode));
        } else if (this.options.view === VIEW_TROND) {
            let rootNode = new TreeNode('root', 'root');
            rootNode.setExpanded(true);

            // collect all albums:
            let albums = this.library.tree.treeFlat.filter((_node) => _node instanceof Album);

            // collect all years
            let years = new Map();
            for (let i = 0, I = albums.length; i < I; i++) {
                let key = albums[i].getFullYear().toString();
                if (years.get(key) !== undefined) {
                    years.set(key, [albums[i], ...years.get(key)]);
                } else {
                    years.set(key, [albums[i]]);
                }

            }

            years.forEach((_albums, _year) => {
                let folder = new Folder(_year, _year);

                _albums.forEach((_album) => {
                    // get parent artist
                    let parentArtistNode = TreeNode.getParentNode(this.library.tree.treeFlat, _album);
                    let parentGenreNode = TreeNode.getParentNode(this.library.tree.treeFlat, parentArtistNode);

                    let genre = folder.children.find(_child => _child instanceof Genre && _child.id === parentGenreNode.id);
                    if (genre === undefined && parentGenreNode instanceof TreeNode) {
                        genre = new Genre(parentGenreNode.name);
                        folder.addChild(genre);
                    } else {
                        folder.addChild(genre);
                    }

                    let artist = genre.children.find(_child => _child instanceof Artist && _child.id === parentArtistNode.id);
                    if (artist === undefined) {
                        artist = new Artist(parentArtistNode.id, parentArtistNode.name);
                        artist.addChild(_album);
                        genre.addChild(artist);
                    } else {
                        artist.addChild(_album);
                    }

                    folder.addChild(genre);

                });

                rootNode.addChild(folder);
            });

            rootNode.children.sort((a, b) => {
                return b.name.localeCompare(a.name);
            });
            //console.log(rootNode.children)
            this.populateViewLibraryByTree(new Tree(rootNode));
        } else {//} if (this.options.view === VIEW_TREE) {
            this.options.view = VIEW_TREE;
            console.debug('in options.view === VIEW_TREE')
            this.populateViewLibraryByTree(this.library.tree);
        }

        $('div#viewStats').text('Holding: ' + this.library.getNumGenres() + ' Genres, ' + this.library.getNumArtists() + ' Artists, ' + this.library.getNumAlbums() + ' Albums');
        console.log();

        let keyword = $('input#searchKeyword').val();
        if (keyword.length > 0) {
            this.filterTree(keyword);
        }

    }

    populateViewLibraryByTree(tree) {
        console.debug('populateViewLibraryByTree()');
        this.renderedTree = tree;
        if (tree === null || tree === undefined) {
            console.debug('tree === null || tree === undefined')
            return false;
        }

        const ulLibraryNew = this.generateUlFromTreeNodes([tree.rootNode], true);

        // switch content of old ul to new ul because we need to keep the expanded items expanded
        const divLibrary = $('#divLibrary');
        divLibrary.empty();
        divLibrary.append(ulLibraryNew);
    }

    makeDropTarget(element) {
        // highlight the potential target
        element.addEventListener('dragenter', (event) => {
            if (this.dragged.uniqueId !== event.target.objRef.uniqueId) {
                event.target.classList.add('highlight');
            }
        });

        element.addEventListener('dragleave', (event) => {
            event.target.classList.remove('highlight');
        });

        element.addEventListener('dragover', (event) => {
            if (this.dragged.uniqueId !== event.target.objRef.uniqueId) {
                // prevent default to allow drop
                event.preventDefault();
            }
        });

        element.addEventListener('drop', (event) => {
            event.target.classList.remove('highlight');
            console.log(this.dragged.id + ' has been dropped into ' + event.target.objRef.id);


            // find parent node of dragged element
            let parentNode = TreeNode.getParentNode(this.library.tree.treeFlat, this.dragged);
            //console.log(this.dragged);
            //console.log(parentNode);

            // test if the target is dragged into its old parent node
            if (parentNode !== undefined && parentNode.uniqueId !== event.target.objRef.uniqueId) {

                // add dragged node as child to target node
                event.target.objRef.addChild(this.dragged);

                // sorting should be done in the generateUlFromxxx
                //event.target.objRef.sortChildrenByName();

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

        if (parentExpanded) {
            ul.classList.add('active');
        } else {
            ul.classList.add('inactive');
        }

        for (let i = 0, I = nodes.length; i < I; i++) {
            if (!(nodes[i] instanceof TreeNode)) {
                break;
            }
            const li = document.createElement('li');

            const spanName = document.createElement('span');
            //spanName.classList.add(level);

            // must be on the li or the display:block; causes the span and cursor to show over the whole width
            if (nodes[i].visible) {
                li.classList.add('active');
            } else {
                li.classList.add('inactive');
            }

            li.append(spanName);

            spanName.id = nodes[i].id;
            // add a reference to the object for drag&drop
            spanName.objRef = nodes[i];
            spanName.innerText = nodes[i].getInnerText();

            if (this.options.view === VIEW_TREE) {
                this.makeDraggable(spanName);
            }

            switch (true) {
                case nodes[i] instanceof Album:
                    spanName.classList.add('caret');
                    spanName.addEventListener('click', () => {
                        this.spotify.startPlayback(nodes[i].id);
                    });
                    break;
                default:
                    if (nodes[i].expanded) {
                        spanName.classList.add('collapsable');
                    } else {
                        spanName.classList.add('expandable');
                    }
                    // sort albums for visualization todo: vllt umbenennen in sortFolders oder so
                    nodes[i].sortChildren(this.options.sortAlbums, this.options.view);
                    /*
                    if(this.options.sortAlbums === SORT_BY_YEAR) {
                        nodes[i].children.sort(Utils.sortByYear);
                    } else {
                        nodes[i].children.sort(Utils.sortByName);
                    }*/
                    if (this.options.view === VIEW_TREE) {
                        this.makeDropTarget(spanName);
                    }
            }

            if (nodes[i].children.length > 0) {
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
            } else {
                spanName.classList.add('empty');
            }

            if (this.options.view === VIEW_TREE) {
                spanName.classList.add('caret');
                spanName.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.rightClicked = spanName.objRef;
                    let contextmenu = $('#contextmenu');
                    contextmenu.css({
                        display: 'block', //show the menu
                        top: e.pageY, //make the menu be where you click (y)
                        left: e.pageX //make the menu be where you click (x)
                    });
                });
            }
            fragment.append(li);
        }
        ul.append(fragment);

        return ul;
    }

    filterTree(keyword) {
        //console.log('filterTree('+keyword+')');
        this.renderedTree.treeFlat.map(_child => {
            _child.setVisible(false);
        });
        this.renderedTree.treeFlat.map(_child => {
            let isMatch = _child.name.toLowerCase().includes(keyword.toLowerCase());
            if (isMatch) {
                _child.setVisible(true);
                //_child.setExpanded(true);
                let parentNode = TreeNode.getParentNode(this.renderedTree.treeFlat, _child);
                while (parentNode !== undefined) {
                    parentNode.setVisible(true);
                    //parentNode.setExpanded(true);
                    parentNode = TreeNode.getParentNode(this.renderedTree.treeFlat, parentNode);
                }
                let children = TreeNode.getAllChildren(_child);
                children.map(__child => {
                    __child.setVisible(true);
                });
            }
        });
        this.populateViewLibraryByTree(this.renderedTree);
        //this.populateViewLibrary();
    }

    populateSelectGenresSub() {
        console.debug('populateSelectGenresSub()')
        let selectGenreMain = $('select#genreMain');
        let selectGenresSub = $('select#genresSub');
        let inputGenresSubKeyword = $('input#genresSubKeyword');

        let size = (this.library.getNumGenres() <= 100) ? 10 : Math.ceil(this.library.getNumGenres() / 10);
        selectGenresSub.attr('size', size);
        selectGenresSub.empty();
        let selectedGenreMainValue = selectGenreMain.children(':selected').attr('value');
        this.library.getGenres().forEach(_genre => {
            //console.log(inputGenresSubKeyword.val());
            if (selectedGenreMainValue !== _genre.id && _genre.name.includes(inputGenresSubKeyword.val())) {
                selectGenresSub.append($('<option />').val(_genre.id).text(_genre.name));
            }
        });
    }

    populateClusterGenres() {
        console.debug('populateClusterGenres()');
        if ($('#fieldsetClusterGenres').is(':visible')) {
            let selectGenreMain = $('select#genreMain');
            selectGenreMain.empty();

            let selectGenreSub = $('select#genresSub');
            selectGenreSub.empty();
            selectGenreSub.change(() => {
                if ($('select#genresSub').val().length > 0) {
                    $('button#buttonStoreGenresSub').attr('disabled', false);
                } else {
                    $('button#buttonStoreGenresSub').attr('disabled', true);
                }
            });


            this.library.getGenres().forEach(_genre => {
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
            if (device.active) {
                this.options.selectedDevice = device.id;
                option.selected = true;
            }
            selectDevices.append(option);
        });

        let deviceActive = arrayDevices.find(element => element.active === true);
        if (arrayDevices.length > 0) {
            if (deviceActive === undefined) {
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

        ARRAY_VIEWS.forEach((_view) => {
            selectView.append($('<option />').val(_view).text(_view));
        });

        if (ARRAY_VIEWS.find(_view => _view === this.options.view) === undefined) {
            this.options.view = DEFAULT_VIEW;
        }

        $('#selectView > option[value=' + this.options.view + ']').attr('selected', 'selected');
    }

    populateSelectSortAlbumsBy() {
        console.debug('populateSelectSortAlbumsBy()');
        let selectSortAlbums = $('#selectSortAlbums');
        selectSortAlbums.empty();

        ARRAY_SORTS.forEach((_sort) => {
            selectSortAlbums.append($('<option />').val(_sort).text(_sort));
        });

        if (ARRAY_SORTS.find(_view => _view === this.options.sortAlbums) === undefined) {
            this.options.sortAlbums = DEFAULT_SORT;
        }

        $('#selectSortAlbums > option[value=' + this.options.sortAlbums + ']').attr('selected', 'selected');
    }

    bindContextmenu() {
        {
            let entryAddGenre = $('#cmAddGenre');
            entryAddGenre.on('click', () => {
                $('#contextmenu').hide();
                document.getElementById('dialogAddGenre').showModal();
            });

            let entryAddFolder = $('#cmAddFolder');
            entryAddFolder.on('click', () => {
                $('#contextmenu').hide();
                document.getElementById('dialogAddFolder').showModal();
            });
        }
    }

    bindButtons() {
        {
            let button = $('#buttonDialogAddGenre');
            button.on('click', () => {
                button.attr('disabled', true);
                let inputGenreName = $('#dialogInputAddGenre');
                let genreName = inputGenreName.val();
                if (this.rightClicked !== undefined && this.rightClicked !== null) {
                    if (this.library.addGenreByName(this.rightClicked, genreName)) {
                        this.spotify.statusManager.setStatusText('Added new genre "' + genreName + '".');
                    } else {
                        this.spotify.statusManager.setStatusText('Did not add genre "' + genreName + '", possible duplicate.');
                    }
                }
                inputGenreName.val('');
                button.attr('disabled', false);
                document.getElementById('dialogAddGenre').close();
            });
        }
        {
            let button = $('#buttonDialogAddFolder');
            button.on('click', () => {
                button.attr('disabled', true);
                let inputFolderName = $('#dialogInputAddFolder');
                let folderName = inputFolderName.val();
                if (this.rightClicked !== undefined && this.rightClicked !== null) {
                    if (this.library.addFolderByName(this.rightClicked, folderName)) {
                        this.spotify.statusManager.setStatusText('Added new folder "' + folderName + '".');
                    } else {
                        this.spotify.statusManager.setStatusText('Did not add folder "' + folderName + '", possible duplicate.');
                    }
                }
                inputFolderName.val('');
                button.attr('disabled', false);
                document.getElementById('dialogAddFolder').close();
            });
        }
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
                if (numReduced === 0) {
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
                if (numReduced === 0) {
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
                let currentState = this.stateManager.getCurrentState(true);
                //let data = "data:text/json;charset=utf-8," + encodeURIComponent('{"genres": ' + currentState.genres + ', "artists":' + currentState.artists + ', "treeFlat":' + currentState.treeFlat + ', "options": ' + currentState.options + '}');
                let data = "data:text/json;charset=utf-8," + encodeURIComponent('{"treeFlat":' + currentState.treeFlat + ', "options": ' + currentState.options + '}');
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
                //button.attr('disabled', true); its modal anyway
                let input = document.createElement('input');
                input.type = 'file';
                input.onchange = () => {
                    this.stateManager.loadFromFile(input.files[0]);
                    //button.attr('disabled', false);
                }
                input.click();
            });
        }


        $('#buttonClusterGenres').on('click', () => {
            $('#fieldsetClusterGenres').toggle();
            this.populateClusterGenres();
        });

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
            //console.log($('input#searchKeyword').val());
            //this.filterViewLibrary();
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(function () {
                this.filterTree($('input#searchKeyword').val());
            }.bind(this), 250)
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

        $('#cmAddGenre').on('click', () => {
            console.log(this.rightClicked);
        });
    }

}
