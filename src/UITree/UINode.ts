import { AXNode } from "../AccessibilityTree/AccessibilityNode.js";
import { RenderContext } from "../Renderer/RenderContext.js";

export type StandaloneRenderer = (
  context: RenderContext,
  rawNode: AXNode | undefined
) => string;
export type ParentRenderer = (
  context: RenderContext,
  rawNode: AXNode | undefined,
  child: IterableIterator<string>
) => IterableIterator<string>;

export type UINodeBase = {
  focused: boolean;
  rawNode?: AXNode;
  /**
   * Position of the node when rendered.
   */
  renderedPosition?: {
    start: number;
    end: number;
  };
};

export type WrapperUINode = UINodeBase & {
  type: "wrapper";
  renderHeader: StandaloneRenderer;
  renderIndent: StandaloneRenderer;
  children: readonly UINode[];
};

export type BlockUINode = UINodeBase & {
  type: "block";
  render: ParentRenderer;
  children: readonly UINode[];
};

export type ListItemUINode = UINodeBase & {
  type: "listitem";
  renderMarker: StandaloneRenderer;
  children: readonly UINode[];
};

export type InlineUINode = UINodeBase & {
  type: "inline";
  render: ParentRenderer;
  children: readonly UINode[];
};

export type UINode =
  | WrapperUINode
  | BlockUINode
  | ListItemUINode
  | InlineUINode;
