import type { ProtocolMapping } from "puppeteer";

export type AXNode =
  ProtocolMapping.Commands["Accessibility.getRootAXNode"]["returnType"]["node"];

export type AccessibilityNode = {
  /**
   * The unique identifier for this node.
   */
  id: string;
  /**
   * List of child nodes.
   */
  children: AccessibilityNode[];
};
