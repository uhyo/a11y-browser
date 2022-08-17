import { AXNode } from "../AccessibilityTree/AccessibilityNode.js";
import { RenderContext } from "../Renderer/RenderContext.js";
import { IsNever } from "../util/types/IsNerver.js";

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

export type InlineUINode = UINodeBase & {
  type: "inline";
  render: ParentRenderer;
  children: readonly UINode[];
};

export type ListItemUINode = UINodeBase & {
  type: "listitem";
  renderMarker: StandaloneRenderer;
  children: readonly UINode[];
};

export type TableUINode = UINodeBase & {
  type: "table";
  renderHeader: StandaloneRenderer;
  rows: readonly RowUINode[];
};

export type RowUINode = UINodeBase & {
  type: "row";
  cells: readonly CellUINode[];
};

export type CellUINode = UINodeBase & {
  type: "cell";
  children: readonly UINode[];
};

export type UINode =
  | WrapperUINode
  | BlockUINode
  | ListItemUINode
  | InlineUINode
  | TableUINode;

export type IntermediateUINode = UINode | RowUINode | CellUINode;

export function allTypesOfUINode<Arr extends readonly string[]>(
  arr: [...Arr]
): IsNever<Exclude<UINode["type"], Arr[number]>> extends true
  ? IsNever<Exclude<Arr[number], UINode["type"]>> extends true
    ? Arr
    : unknown
  : unknown {
  return arr;
}

const allUINodeTypes = allTypesOfUINode([
  "wrapper",
  "block",
  "inline",
  "listitem",
  "table",
]);

export function isUINode(node: IntermediateUINode): node is UINode {
  const types: readonly IntermediateUINode["type"][] = allUINodeTypes;
  return types.includes(node.type);
}
