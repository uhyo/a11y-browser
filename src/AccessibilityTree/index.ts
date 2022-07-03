import { AccessibilityNode, AXNode } from "./AccessibilityNode.js";
import { convert } from "./convert.js";

/**
 * Mutable tree of accessibility nodes.
 */
export class AccessibilityTree {
  #nodes: Map<string, AccessibilityNode> = new Map();

  /**
   * Replaces the current tree with a new one.
   */
  public initialize(nodes: readonly AXNode[]): void {
    this.#nodes.clear();
    convert(nodes, this.#nodes);
  }

  /**
   * Gets node by id.
   */
  public getById(id: string): AccessibilityNode | undefined {
    return this.#nodes.get(id);
  }
}
