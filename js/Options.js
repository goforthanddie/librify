const SORT_BY_YEAR = 'year';
const SORT_BY_NAME = 'name';

const ARRAY_SORTS = [SORT_BY_YEAR, SORT_BY_NAME];
const DEFAULT_SORT = SORT_BY_NAME;

const VIEW_ARTIST = 'artist';
const VIEW_GENRE = 'genre';
const VIEW_TREE = 'custom';

const VIEW_TROND = 'trond';

const ARRAY_VIEWS = [VIEW_ARTIST, VIEW_GENRE, VIEW_TREE, VIEW_TROND];
const DEFAULT_VIEW = VIEW_TREE;

class Options {

	dataType = Options.name;

	sortAlbums;
	view;
	selectedDevice;

	constructor() {
	}
}
