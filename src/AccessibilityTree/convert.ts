import { AccessibilityNode, AXNode } from "./AccessibilityNode.js";

export function convertOneNode(node: AXNode): AccessibilityNode {
  const accessibilityNode: Omit<AccessibilityNode, "rawNode"> = {
    id: node.nodeId,
    parentId: node.parentId,
    backendDOMNodeId: node.backendDOMNodeId,
    role: node.role?.value ?? "",
    children: [],
  };
  Object.defineProperty(accessibilityNode, "rawNode", {
    value: node,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  const result = accessibilityNode as AccessibilityNode;
  return result;
}

/**
 * Converts given set of AXNode to AccessibilityNode.
 */
export function convert(
  nodes: Iterable<AXNode>,
  nodeMap: Map<string, AccessibilityNode>,
): void {
  // construct nodes
  const ns = [];
  for (const node of nodes) {
    const a = convertOneNode(node);
    nodeMap.set(a.id, a);
    ns.push(node);
  }
  // construct the tree
  for (const node of ns) {
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
