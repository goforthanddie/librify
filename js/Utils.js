class Utils {

    // custom reviver to parse the stringified library back into objects
    static reviver(key, value) {
        if(typeof value === 'object' && value !== null) {
            if (value.dataType === 'Artist') {
                let artist = new Artist(value.id, value.name);
                value.albums.forEach(_album => {
                    // re-stringify and parse to force invocation of === 'Album'
                    let album = JSON.parse(JSON.stringify(_album), Utils.reviver);
                    //let album = new Album(_album.id, _album.name); // you could probably re-stringify the object and parse separately to achieve invocation of the case === 'Album'
                    artist.addAlbum(album);
                });
                return artist;
            } else if(value.dataType === 'Album') {
                let album = new Album(value.id, value.name);
                return album;
            }
        }
        return value;
    }
}