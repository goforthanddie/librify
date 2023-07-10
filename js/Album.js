class Album extends TreeNode {

    dataType = Album.name;

    releaseDate;
    releaseDatePrecision;

    constructor(id, name, releaseDate, releaseDatePrecision) {
        super(id, name);
        this.releaseDate = releaseDate;
        this.releaseDatePrecision = releaseDatePrecision;
    }

    getInnerText() {
        return new Date(this.releaseDate).getFullYear() + ' ' + this.name;
    }
}