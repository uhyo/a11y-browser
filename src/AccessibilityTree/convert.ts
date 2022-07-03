import { AccessibilityNode, AXNode } from "./AccessibilityNode.js";

/**
 * Converts given set of AXNode to AccessibilityNode.
 */
export function convert(
  nodes: readonly AXNode[],
  nodeMap: Map<string, AccessibilityNode>,
  rawNodeMap: WeakMap<AccessibilityNode, AXNode>
): void {
  // construct nodes
  for (const node of nodes) {
    const accessibilityNode = {
      id: node.nodeId,
      children: [],
    };
    nodeMap.set(accessibilityNode.id, accessibilityNode);
    rawNodeMap.set(accessibilityNode, node);
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
