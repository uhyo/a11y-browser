import { AccessibilityNode, AXNode } from "./AccessibilityNode.js";
import { convert } from "./convert.js";

/**
 * Mutable tree of accessibility nodes.
 */
export class AccessibilityTree {
  #nodes: Map<string, AccessibilityNode> = new Map();
  #rawNodeMap: WeakMap<AccessibilityNode, AXNode> = new WeakMap();

  /**
   * Replaces the current tree with a new one.
   */
  public initialize(nodes: readonly AXNode[]): void {
    this.#nodes.clear();
    this.#rawNodeMap = new WeakMap();
    convert(nodes, this.#nodes, this.#rawNodeMap);
  }

  /**
   * Gets node by id.
   */
  public getById(id: string): AccessibilityNode | undefined {
    return this.#nodes.get(id);
  }
}
