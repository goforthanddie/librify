class TreeNode {

	dataType = TreeNode.name;

	uniqueId;
	id;
	name;
	children;

	expanded;
	visible;

	constructor(id, name) {
		this.children = [];
		this.id = id;
		this.uniqueId = uniqueId({});
		this.name = name;
		this.expanded = false;
		this.visible = true;
	}

	setVisible(visibility) {
		this.visible = visibility;
	}

	addChild(child) {
		if(this.children.find(element => element.uniqueId === child.uniqueId) === undefined) {
			this.children.push(child);
			return true;
		}
		return false;
	}

	removeChild(child) {
		let childIdx = this.children.findIndex(element => element.uniqueId === child.uniqueId);
		if(childIdx !== -1) {
			return this.children.splice(childIdx, 1);
		}
		return false;
	}

	getInnerText() {
		return this.name + ' (' + this.children.length + ')';
	}

	toggleExpanded() {
		this.expanded = !this.expanded;
	}

	setExpanded(expanded) {
		this.expanded = expanded;
	}

	static getAllChildren(treeNode) {
		if(treeNode !== undefined && treeNode !== null) {
			let children = [treeNode];
			treeNode.children.map(_child => {
				children.push(...TreeNode.getAllChildren(_child));
			});
			return children;
		} else {
			return [];
		}

	}

	static getParentNode(nodes, child) {
		return nodes.find(_node => _node.children.find(_child => _child.uniqueId === child.uniqueId) !== undefined);
	}

	sortChildrenByName() {
		this.children.sort((a, b) => a.name.localeCompare(b.name));
	}

	sortChildren(sortAlbums) {
		// folders / genres first, then artists, then albums, then others
		let genres = [];
		let artists = [];
		let albums = [];
		let others = [];
		for (let i = 0, I = this.children.length; i < I; i++) {
			let currentChild = this.children[i];
			switch(true) {
				case currentChild instanceof Genre:
					genres.push(currentChild);
					break;
				case currentChild instanceof Artist:
					artists.push(currentChild);
					break;
				case currentChild instanceof Album:
					albums.push(currentChild);
					break;
				default:
					others.push(currentChild);
			}
		}
		genres.sort(Utils.sortByName);
		artists.sort(Utils.sortByName);
		others.sort(Utils.sortByName);
		switch(sortAlbums) {
			case SORT_BY_YEAR:
				albums.sort(Utils.sortByYear);
				break;
			case SORT_BY_NAME:
				albums.sort(Utils.sortByName);
				break;
			default:
				albums.sort(Utils.sortByName);
		}


		this.children = [...genres, ...artists, ...albums, ...others];
	}
}

