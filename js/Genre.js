class Genre extends TreeNode {

	dataType = Genre.name;

	constructor(name) {
		// todo: generate unique id
		let id = name.replace(/\s/g,'').replace(/&/g, '').replace(/\'/g, '');
		super(id, name);
	}
}

const GENRE_DEFAULT = new Genre('None');