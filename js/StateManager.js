const NUM_MAX_STATES = 10;

class StateManager {

    states;
    currentStateIdx;
    library;
    options;

    constructor(library, options) {
        this.states = [];

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
    }

    getCurrentState(serialized = true) {
        this.updateControlElements();
        if (this.states.length > 0 && this.currentStateIdx >= 0 && this.currentStateIdx <= this.states.length) {
            console.debug('returning this.states[' + this.currentStateIdx + ']' + ' serialized:' + serialized);
            if (serialized) {
                return this.states[this.currentStateIdx];
            } else {
                return {
                    treeFlat: JSON.parse(this.states[this.currentStateIdx].treeFlat, Utils.reviverTreeFlat.bind(this.library)),
                    options: JSON.parse(this.states[this.currentStateIdx].options, Utils.reviverOptions)
                };
            }
        }
        return undefined;
    }

    loadCurrentState() {
        console.debug('loadCurrentState() ' + this.currentStateIdx);
        let currentState = this.getCurrentState(false);
        console.log(currentState);
        if (currentState !== undefined) {
            let treeFlat = currentState.treeFlat;
            for (let i = 0, I = treeFlat.length; i < I; i++) {
                for (let j = 0, J = treeFlat[i].children.length; j < J; j++) {
                    treeFlat[i].children[j] = this.library.oldNewUniqueId.get(treeFlat[i].children[j]);
                }
            }
            this.library.tree = new Tree(treeFlat[0].setExpanded(true));

            this.options.view = currentState.options.view;
            this.options.sortAlbums = currentState.options.sortAlbums;
            this.library.notifyUpdateListeners(false);
        }
    }

    saveCurrentState() {
        console.debug('saveCurrentState()');
        let currentState = {
            treeFlat: JSON.stringify(this.library.tree.treeFlat, Utils.replacerTreeFlat),
            options: JSON.stringify(this.options)
        };

        // remove all states after the current state if we are not in the last state
        // if we come from an undo() operation, we start a new branch of states after the current state
        if (this.currentStateIdx < this.states.length - 1) {
            console.debug('this.states.splice(' + this.currentStateIdx + ')');
            this.states.splice(this.currentStateIdx + 1);
        }


        // if NUM_MAX_STATES is reached we have to remove the first element of the states array before pushing a new one
        if (this.states.length >= NUM_MAX_STATES) {
            console.debug('shifting one state')
            this.states.shift();
        }
        //console.log(spotify.artists);
        this.currentStateIdx = this.states.push(currentState) - 1;
        this.updateControlElements();
    }

    loadFromFile(file) {
        console.debug('loadFromFile()');
        let fr = new FileReader();
        fr.onload = function receivedText() {
            let data = JSON.parse(fr.result);
            console.log(data);

            if (data.treeFlat !== null && data.treeFlat !== undefined) {
                localStorage.removeItem('treeFlat');
                localStorage.setItem('treeFlat', JSON.stringify(data.treeFlat));
            } else {
                console.debug('data.treeFlat === null');
            }

            if (data.options !== null && data.options !== undefined) {
                localStorage.removeItem('options');
                localStorage.setItem('options', JSON.stringify(data.options));
            } else {
                console.debug('data.options === null');
            }
            this.loadFromLocalStorage();
        }.bind(this);
        fr.readAsText(file);
    }

    loadFromLocalStorage(saveCurrentState = true) {
        console.debug('loadFromLocalStorage()');
        let options = localStorage.getItem('options');
        if (options != null) {
            // do not directly set this.options = JSON.parse(options, Utils.reviverOptions); this generates a new object and then there are two differing Options objects in spotify and library
            let tmpOptions = JSON.parse(options, Utils.reviverOptions);
            this.options.view = tmpOptions.view;
            this.options.sortAlbums = tmpOptions.sortAlbums;
        } else {
            // default initialization
            this.options.sortAlbums = DEFAULT_SORT;
            this.options.view = DEFAULT_VIEW;
        }

        let treeFlat = localStorage.getItem('treeFlat');
        if (treeFlat != null) {
            //console.log(treeFlat)
            let treeFlatB = JSON.parse(treeFlat, Utils.reviverTreeFlat.bind(this.library));
            //console.log(treeFlatB)

            for (let i = 0, I = treeFlatB.length; i < I; i++) {
                for (let J = treeFlatB[i].children.length - 1; J >= 0; J--) {
                    //for (let j = 0, J = treeFlatB[i].children.length; j < J; j++) {
                    let mapObj = this.library.oldNewUniqueId.get(treeFlatB[i].children[J]);
                    if (mapObj !== undefined) { // test if we can resolve the child id to an object, and only if so, replace the current "oldId" which is the value of children[j] with the real object
                        treeFlatB[i].children[J] = mapObj;
                    } else {
                        console.log('removing: ');
                        console.log(treeFlatB[i].children[J]);
                        console.log(mapObj);
                        // remove the unavailable id from children array
                        treeFlatB[i].children.splice(J, 1);
                    }
                    //treeFlatB[i].children[j] = this.library.oldNewUniqueId.get(treeFlatB[i].children[j]);
                }
            }

            if (treeFlatB.length > 0) {
                //this.library.tree = this.library.treeFlat[0].toggleExpanded();
                this.library.tree = new Tree(treeFlatB[0].setExpanded(true));
            }
        } else {
            this.library.tree = new Tree(new TreeNode('root', 'root'));
        }

        this.library.notifyUpdateListeners(saveCurrentState);
    }

    saveToLocalStorage(saveCurrentState = true) {
        console.debug('saveToLocalStorage()');

        localStorage.removeItem('options');
        localStorage.setItem('options', JSON.stringify(this.options));

        localStorage.removeItem('treeFlat');
        let stringifiedTreeFlat = JSON.stringify(this.library.tree.treeFlat, Utils.replacerTreeFlat);
        localStorage.setItem('treeFlat', stringifiedTreeFlat);
        //console.log(stringifiedTreeFlat);

        if (saveCurrentState) {
            this.saveCurrentState();
        }
    }

    undo() {
        console.debug('undo()');
        if (this.currentStateIdx > 0) {
            this.currentStateIdx = this.currentStateIdx - 1;
            this.loadCurrentState();
            return true;
        } else {
            return false;
        }
    }

    redo() {
        console.debug('redo()');
        if (this.currentStateIdx < this.states.length - 1) {
            this.currentStateIdx = this.currentStateIdx + 1;
            this.loadCurrentState();
            return true;
        } else {
            return false;
        }
    }

    updateControlElements() {
        console.debug('updateControlElements()');
        if (this.currentStateIdx >= 0 && this.currentStateIdx < this.states.length - 1) {
            $('#buttonRedo').attr('disabled', false);
        } else {
            $('#buttonRedo').attr('disabled', true);
        }

        if (this.currentStateIdx > 0) {
            $('#buttonUndo').attr('disabled', false);
        } else {
            $('#buttonUndo').attr('disabled', true);
        }
    }
}