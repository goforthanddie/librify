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
		let children = [treeNode];
		treeNode.children.map(_child => {
			children.push(...TreeNode.getAllChildren(_child));
		});
		return children;
	}

	static getParentNode(nodes, child) {
		return nodes.find(_node => _node.children.find(_child => _child.uniqueId === child.uniqueId) !== undefined);
	}

}
