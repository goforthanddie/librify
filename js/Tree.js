class Tree {
    rootNode;
    treeFlat;

    constructor(rootNode) {
        this.rootNode = rootNode;
        this.updateTreeFlat();
    }

    addNode(node, parentNode = null) {
        if (node instanceof TreeNode) {
            this.treeFlat.push(node);
            if (parentNode !== null) {
                parentNode.addChild(node);
            }
            return true;
        }
        return false;
    }

    /**
     * iterates the flat tree and removes children which are not existing in the flat tree anymore
     */
    removeDeadChildren() {
        for (let I = this.treeFlat.length - 1; I >= 0; I--) {
            for (let J = this.treeFlat[I].children.length - 1; J >= 0; J--) {
                let nodeIdx = this.treeFlat.findIndex(_node => _node instanceof TreeNode && _node.uniqueId === this.treeFlat[I].children[J].uniqueId);
                if(nodeIdx === -1) {
                    this.treeFlat[I].children.splice(nodeIdx, 1);
                }
            }
        }
    }

    updateTreeFlat() {
        this.treeFlat = this.getNodes();
    }

    getNodes() {
        if (this.rootNode !== null && this.rootNode !== undefined) {
            return TreeNode.getAllChildren(this.rootNode);
        }
        return [];
    }

    removeNodeAndReferences(node) {
        this.removeNode(node);

        // remove node object from all children
        for (let I = this.treeFlat.length - 1; I >= 0; I--) {
            let childIdx = this.treeFlat[I].children.findIndex(_child => _child.uniqueId === node.uniqueId);
            if (childIdx !== -1) {
                this.treeFlat[I].children.splice(childIdx, 1);
            }
        }
    }

    removeNode(node) {
        for (let I = this.treeFlat.length - 1; I >= 0; I--) {
            if (this.treeFlat[I].uniqueId === node.uniqueId) {
                this.treeFlat.splice(I, 1);
            }
        }
    }

}