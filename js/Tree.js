class Tree {

    rootNode;

    constructor(rootNode) {
        this.rootNode = rootNode;
    }

    getNodes() {
        if (this.rootNode !== null && this.rootNode !== undefined) {
            TreeNode.getAllChildren(this.rootNode);
        }
    }

}