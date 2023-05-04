class Album {

    dataType = Album.name;

    id;
    name;
    releaseDate;
    releaseDatePrecision;

    constructor(id, name, releaseDate, releaseDatePrecision) {
        this.id = id;
        this.name = name;
        this.releaseDate = releaseDate;
        this.releaseDatePrecision = releaseDatePrecision;
    }
}