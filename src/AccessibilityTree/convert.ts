import { AccessibilityNode, AXNode } from "./AccessibilityNode.js";

/**
 * Converts given set of AXNode to AccessibilityNode.
 */
export function convert(
  nodes: readonly AXNode[],
  nodeMap: Map<string, AccessibilityNode>
): void {
  // construct nodes
  for (const node of nodes) {
    const accessibilityNode: Omit<AccessibilityNode, "rawNode"> = {
      id: node.nodeId,
      parentId: node.parentId,
      backendDOMNodeId: node.backendDOMNodeId,
      children: [],
    };
    Object.defineProperty(accessibilityNode, "rawNode", {
      value: node,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    const a = accessibilityNode as AccessibilityNode;
    nodeMap.set(accessibilityNode.id, a);
  }
  // construct the tree
  for (const node of nodes) {
    const { childIds } = node;
    if (!childIds) {
      continue;
    }
    const parent = nodeMap.get(node.nodeId);
    if (!parent) {
      throw new Error(`Parent node not found: ${node.nodeId}`);
    }
    for (const childId of childIds) {
      const child = nodeMap.get(childId);
      if (child) {
        parent.children.push(child);
      }
    }
  }
}
