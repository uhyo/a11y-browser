import { AXNode } from "../AccessibilityTree/AccessibilityNode.js";
import { RenderContext } from "../Renderer/RenderContext.js";

export type HeaderRenderer = (
  context: RenderContext,
  rawNode: AXNode | undefined
) => string;
export type InlineRenderer = (
  context: RenderContext,
  rawNode: AXNode | undefined,
  child: string
) => string;

export type WrapperUINode = {
  type: "wrapper";
  renderHeader: HeaderRenderer;
  children: readonly UINode[];
};

export type BlockUINode = {
  type: "block";
  children: readonly UINode[];
};

export type InlineUINode = {
  type: "inline";
  render: InlineRenderer;
  children: readonly UINode[];
};

export type UINode = WrapperUINode | BlockUINode | InlineUINode;
