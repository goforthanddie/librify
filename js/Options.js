const SORT_BY_YEAR = 'year';
const SORT_BY_NAME = 'name';

const VIEW_ARTIST = 'artist';
const VIEW_GENRE = 'genre';
const VIEW_TREE = 'tree';

class Options {

	dataType = Options.name;

	sortAlbums;
	view;
	selectedDevice;

	constructor() {
	}
}
