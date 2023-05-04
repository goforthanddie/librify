const SORT_BY_YEAR = 'year';
const SORT_BY_NAME = 'name';

class Options {

	dataType = Options.name;

	sortAlbums;

	constructor() {
		this.sortAlbums = SORT_BY_YEAR;
	}

}
