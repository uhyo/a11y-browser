import type { ProtocolMapping } from "puppeteer";

export type AXNode =
  ProtocolMapping.Commands["Accessibility.getRootAXNode"]["returnType"]["node"];

export type AccessibilityNode = {
  /**
   * The unique identifier for this node.
   */
  id: string;
  /**
   * ID of parent node.
   */
  parentId: string | undefined;
  /**
   * ID of backend DOM node.
   */
  backendDOMNodeId: number | undefined;

  /**
   * Role of this node.
   */
  role: string;

  /**
   * List of child nodes.
   */
  children: AccessibilityNode[];
  /**
   * Raw AXNode.
   */
  rawNode: AXNode;
};
