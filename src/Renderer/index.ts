import { UINode } from "../UITree/UINode.js";
import { createDefaultContext, RenderContext } from "./RenderContext.js";

/**
 * Render given node.
 */
export function render(
  node: UINode,
  context: RenderContext = createDefaultContext()
): string {
  let result = "";
  if (node.type === "wrapper" || node.type === "block") {
    if (context.shouldPrintBlockSeparator) {
      result += "\n";
      context.shouldPrintBlockSeparator = false;
    }
  }
  switch (node.type) {
    case "wrapper": {
      const header = node.renderHeader(context, node.rawNode);
      result += header + "\n";
      result += renderBlockChildren(node.children, context, header ? "| " : "");
      context.shouldPrintBlockSeparator = true;
      break;
    }
    case "block": {
      const children = renderInlineChildren(node.children, context);
      result += node.render(context, node.rawNode, children);
      context.shouldPrintBlockSeparator = true;
      break;
    }
    case "listitem": {
      result += node.renderMarker(context, node.rawNode);
      result += renderInlineChildren(node.children, context) + "\n";
      context.shouldPrintBlockSeparator = true;
      break;
    }
    case "inline": {
      const children = renderInlineChildren(node.children, context);
      result += node.render(context, node.rawNode, children);
      context.shouldPrintBlockSeparator = false;
      break;
    }
  }
  return result;
}

function renderInlineChildren(
  nodes: readonly UINode[],
  context: RenderContext
): string {
  return nodes.map((node) => render(node, context)).join("");
}

function renderBlockChildren(
  nodes: readonly UINode[],
  context: RenderContext,
  indent: string = ""
): string {
  const lines = nodes
    .map((node) => render(node, context))
    .join("")
    .split("\n");
  const res = lines.map((line) => indent + line).join("\n") + "\n";
  return res;
}
