class Artist {
    id;
    name;
    albums;

    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.albums = new Array();
    }

    addAlbum(album) {
        // add only if album id ist not yet existing
        if(this.albums.find(element => element.id == album.id) === undefined) {
            this.albums.push(album);
        }
    }
}