class Library {

    tree;
    updateListeners;
    oldNewUniqueId;

    constructor() {
        this.oldNewUniqueId = new Map();
        // tree is initialized by the stateManager
        this.updateListeners = [];
    }

    addUpdateListener(listener) {
        this.updateListeners.push(listener);
    }

    // if the call is from redo() or undo() we do not want to call saveCurrentState(), got no better idea than that right now.
    // todo: improve D:
    notifyUpdateListeners(saveCurrentState = true) {
        console.debug('notifyUpdateListeners()');
        for (let i = 0, I = this.updateListeners.length; i < I; i++) {
            //console.debug(this.updateListeners[i]);
            this.updateListeners[i].call(null, saveCurrentState);
        }
    }

    getArtists() {
        return this.tree.treeFlat.filter(_node => _node instanceof Artist).sort(Utils.sortByName);
    }

    getGenres() {
        return this.tree.treeFlat.filter(_node => _node instanceof Genre).sort(Utils.sortByName);
    }

    emptyArtists() {
        console.debug('emptyArtists()');
        localStorage.removeItem('artists');
        this.tree.treeFlat = this.tree.treeFlat.filter(_node => !(_node instanceof Artist));
        // this is only called during library updates, so we won't call this.notifyUpdateListeners(); if it would be called, the library empties and we do not have any information about expanded genres, artists and so on
    }

    emptyAlbums() {
        console.debug('emptyAlbums()');
        this.tree.treeFlat = this.tree.treeFlat.filter(_node => !(_node instanceof Album));
    }

    emptyGenres() {
        console.debug('emptyGenres()');
        localStorage.removeItem('genres');
        this.tree.treeFlat = this.tree.treeFlat.filter(_node => !(_node instanceof Genre));
    }

    removeEmptyGenres() {
        console.debug('removeEmptyGenres()');
        //let oldLength = this.genres.length;
        let oldLength = this.getNumGenres();
        //this.genres = this.genres.filter(_genre => _genre.artists.length > 0);
        //let emptyGenres = this.tree.treeFlat.filter(_node => (_node instanceof Genre) && _node.children.length === 0);
        for (let I = this.tree.treeFlat.length - 1; I >= 0; I--) {
            // empty genre check
            if (this.tree.treeFlat[I] instanceof Genre && this.tree.treeFlat[I].children.length === 0) {
                for (let J = this.tree.treeFlat.length - 1; J >= 0; J--) {
                    let childIdx = this.tree.treeFlat[J].children.findIndex(_child => _child.uniqueId === this.tree.treeFlat[I].uniqueId);
                    if (childIdx !== -1) {
                        this.tree.treeFlat[J].children.splice(childIdx, 1);
                    }
                }
                this.tree.treeFlat.splice(I, 1);
            }
        }
        this.notifyUpdateListeners();

        //return oldLength - this.genres.length;
        return oldLength - this.getNumGenres();
    }

    reduceGenres() {
        console.debug('reduceGenres()');
        // this function reduces the amount of genres by going through each artist's spotify genres and keeping only the genre with the most occurrences in the library
        let reducedGenres = [];
        this.getArtists().forEach(_artist => {
            console.debug('_artist=' + _artist.name);
            //console.log(_artist);
            let maxArtistsGenre = 0;
            let maxArtistsGenreIdx;

            let genres = this.getGenres();
            _artist.getGenres(genres);

            // _artist.genres should be empty after a first reduceGenres() call -> _artist.getGenres reads the genres from library.genres so it is not empty.
            // we only need to do this if the artist has more than one genre
            if (_artist.genres.length > 0) {
                _artist.genres.forEach(_genre => {
                    console.debug('_genre=' + _genre);
                    // find genre with most entries
                    let genreIdx = genres.findIndex(element => element.name === _genre);
                    //console.log('genreIdx='+genreIdx);
                    if (genreIdx !== -1) {
                        let numArtists = genres[genreIdx].children.filter(_child => _child instanceof Artist).length;
                        if (numArtists > maxArtistsGenre) {
                            maxArtistsGenre = numArtists;
                            maxArtistsGenreIdx = genreIdx;
                        } else {
                            console.debug('else');
                        }
                        //console.log('maxArtistsGenre='+maxArtistsGenre);
                    } else {
                        console.debug(_genre.name + ' not found in this.genres :O');
                    }
                });
                // if an artist has no associated genres maxArtistsGenreIdx === undefined
                if (maxArtistsGenreIdx !== undefined) {
                    //console.debug(maxArtistsGenreIdx);
                    console.debug('_genre mit meisten artists:' + genres[maxArtistsGenreIdx].name);

                    // remove artist from genres with less artists than the main genre
                    _artist.genres.forEach(_genre => {
                        let genreIdx = genres.findIndex(element => element.name === _genre);
                        if (genreIdx !== -1 && genreIdx !== maxArtistsGenreIdx) {
                            genres[genreIdx].children = genres[genreIdx].children.filter(__artist => __artist instanceof Artist && __artist.id !== _artist.id);
                        }
                    });

                    // remove genres from artist to save memory
                    _artist.genres = [];

                    // test if genre is not already in the new array
                    if (reducedGenres.findIndex(element => element.id === genres[maxArtistsGenreIdx].id) === -1) {
                        console.debug('pushing ' + genres[maxArtistsGenreIdx].name)
                        console.debug(genres[maxArtistsGenreIdx]);
                        reducedGenres.push(genres[maxArtistsGenreIdx]);
                    }
                } else {
                    console.log(_artist);
                }
            }
        });

        // in case the function is called a second time reducedGenres will be empty and thus clean the db
        let oldLength = this.getNumGenres();
        let numReduced = 0;
        if (reducedGenres.length > 0) {
            this.emptyGenres();
            // remove all references to the genres
            for (let i = 0, I = this.tree.treeFlat.length; i < I; i++) {
                for (let J = this.tree.treeFlat[i].children.length - 1; J >= 0; J--) {
                    if (this.tree.treeFlat[i].children[J] instanceof Genre) {
                        this.tree.treeFlat[i].children.splice(J, 1);
                    }
                }
            }
            reducedGenres.forEach(_genre => {
                this.tree.treeFlat.push(_genre);
                this.tree.treeFlat[0].addChild(_genre);
            });
            this.notifyUpdateListeners();
            numReduced = oldLength - reducedGenres.length;
        } else {
            console.log('reduceGenres() has delivered no change.');
        }

        return numReduced;
    }

    reduceGenresFurther() {
        console.debug('reduceGenresFurther()');
        let foundMainGenres = [];
        let foundSubGenres = [];
        console.log(this.genres);
        // identify sub genres, i.e., genres where the name of another genre is part of the name
        this.genres.forEach(_genre => {
            let subGenres = this.genres.filter(element => element.name.includes(_genre.name) && element.id !== _genre.id);
            // test for length > 1 because it will always find itself
            if (subGenres.length > 0) {
                subGenres.forEach(_subgenre => {
                    console.log('subgenre ' + _subgenre.name);
                    // add all the artists of the found sub genres to the main genre
                    _subgenre.artists.forEach(_artist => {
                        _genre.addArtist(_artist);
                    });

                    //_genre.addSubGenre(_subgenre);
                    // test if the sub genre is already in the foundSubGenres array, if not, add it
                    if (foundSubGenres.findIndex(element => element.id === _subgenre.id) === -1) {
                        foundSubGenres.push(_subgenre);
                    }
                });
            }
        });
        // identify main genres, i.e., genres that are not sub genres
        this.genres.forEach(_genre => {
            if (foundSubGenres.findIndex(element => element.id === _genre.id) === -1) {
                // test if the main genre is already in the foundMainGenres array, if not, add it
                if (foundMainGenres.findIndex(element => element.id === _genre.id) === -1) {
                    foundMainGenres.push(_genre);
                }
            }
        });
        console.log(foundMainGenres);
        console.log(foundSubGenres);
        foundMainGenres.forEach(_genre => {
            _genre.sortArtists();
        });
        this.genres = foundMainGenres;

        // test if we still got all the artists
        /*
        let compArtists = [];
        this.genres.forEach(_genre => {
            _genre.artists.forEach(_artist => {
                if(compArtists.findIndex(element => element.id === _artist.id) === -1) {
                    compArtists.push(_artist)
                }
            })
        });
        console.log('compArtists.length=' + compArtists.length);*/
        //console.log(compArtists.sort((a, b) => a.name.localeCompare(b.name)));
        /*
                this.storeGenres();
                this.populateViewLibrary();*/
        //this.saveToLocalStorage();
        this.notifyUpdateListeners();
    }

    clusterGenres() {
        console.debug('clusterGenres()');
        let oldLength = this.getNumGenres();
        let selectGenreMain = $('select#genreMain');
        let genres = this.getGenres();
        let genreMain = genres.find(element => element.id === selectGenreMain.val());
        //console.log(genreMain);
        if (genreMain !== undefined) {
            //console.log(selectGenreSub.children(':selected'));
            // add all the artists of the found subgenres to the main genre
            let selectGenreSub = $('select#genresSub');
            selectGenreSub.val().forEach(_idGenreSub => {
                //console.log(_idGenreSub);
                let genreSub = genres.find(element => element.id === _idGenreSub);
                //console.log(this.library.genres[genreSubIdx]);
                if (genreSub !== undefined) {
                    genreSub.children.forEach(_node => {
                        if (_node instanceof Artist) {
                            genreMain.addChild(_node);
                        }
                    });

                    this.tree.removeNodeAndReferences(genreSub);
                    this.tree.updateTreeFlat();
                }
            });

            $('input#genresSubKeyword').val('');

            this.notifyUpdateListeners();
        }
        return oldLength - this.getNumGenres();
    }

    addGenreByName(parentNode, genreName) {
        if (genreName.trim() != '' && this.tree.treeFlat.find(_child => _child instanceof Genre && _child.name === genreName) === undefined) {
            let genre = new Genre(genreName.toLowerCase(), genreName);
            this.addNode(parentNode, genre); // calls notifyUpdateListeners
            return true;
        } else {
            return false;
        }
    }

    addFolderByName(parentNode, folderName) {
        if (folderName.trim() != '' && this.tree.treeFlat.find(_child => _child instanceof Folder && _child.name === folderName) === undefined) {
            let folder = new Folder(folderName.toLowerCase(), folderName);
            this.addNode(parentNode, folder); // calls notifyUpdateListeners
            return true;
        } else {
            return false;
        }
    }

    addNode(parentNode, node) {
        this.tree.treeFlat.push(node);
        if (parentNode !== undefined && parentNode !== null) {
            parentNode.children.push(node);
        } else {
            console.debug('addNode() parentNode null or undefined');
        }
        this.notifyUpdateListeners();
        return true;
    }


    /**
     * returns the number of unique Album objects in treeFlat
     * @returns {*}
     */
    getNumAlbums() {
        let albums = [];
        let allAlbums = this.tree.treeFlat.filter((_node) => _node instanceof Album);
        for (let j = 0, J = allAlbums.length; j < J; j++) {
            let album = allAlbums[j];
            if (albums.find(element => element === album.id) === undefined) {
                albums.push(album.id);
            }
        }
        return albums.length;
    }

    /**
     * returns the number of all Artist objects in treeFlat
     * @returns {*}
     */
    getNumArtists() {
        return this.getArtists().length;
    }

    /**
     * returns the number of all Genre objects in treeFlat
     * @returns {*}
     */
    getNumGenres() {
        return this.getGenres().length;
    }

    getNumAlbumsNonUnique() {
        /*
        let count = 0;
        for(let i = 0, I = this.artists.length; i < I; i++) {
            count = count + this.artists[i].albums.length;
        }
        return count;
         */
        let allAlbums = this.tree.treeFlat.filter((_node) => _node instanceof Album);
        return allAlbums.length;
    }

    // todo: adapt for new tree technology
    getCount() {
        let count = 0;
        for (let i = 0, I = this.genres.length; i < I; i++) {
            count++;
            for (let j = 0, J = this.genres[i].artists.length; j < J; j++) {
                count++;
                for (let k = 0, K = this.genres[i].artists[j].albums.length; k < K; k++) {
                    count++;
                }
            }
        }
        return count;
    }
}
