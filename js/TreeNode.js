class TreeNode {

	dataType = TreeNode.name;

	id;
	name;
	children;

	constructor(id, name) {
		this.children = [];
		this.id = id;
		this.name = name;
	}

	addChild(child) {
		if(this.children.find(element => element.id === child.id) === undefined) {
			this.children.push(child);
			return true;
		}
		return false;
	}
}