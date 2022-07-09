import { UINode } from "../UITree/UINode.js";
import { createDefaultContext, RenderContext } from "./RenderContext.js";

/**
 * Render given node.
 */
export function* render(
  node: UINode,
  context: RenderContext = createDefaultContext()
): IterableIterator<string> {
  let result = "";
  if (node.type === "wrapper" || node.type === "block") {
    if (context.shouldPrintBlockSeparator) {
      yield "\n";
      context.shouldPrintBlockSeparator = false;
    }
  }
  switch (node.type) {
    case "wrapper": {
      const header = node.renderHeader(context, node.rawNode);
      if (header) {
        yield header + "\n";
      }
      yield* renderBlockChildren(node.children, context, header ? "| " : "");
      context.shouldPrintBlockSeparator = true;
      break;
    }
    case "block": {
      yield* node.render(
        context,
        node.rawNode,
        renderInlineChildren(node.children, context)
      );
      context.shouldPrintBlockSeparator = true;
      break;
    }
    case "listitem": {
      yield node.renderMarker(context, node.rawNode) +
        renderInlineChildren(node.children, context) +
        "\n";
      context.shouldPrintBlockSeparator = true;
      break;
    }
    case "inline": {
      const children = renderInlineChildren(node.children, context);
      yield* node.render(context, node.rawNode, children);
      context.shouldPrintBlockSeparator = false;
      break;
    }
  }
  return result;
}

function* renderInlineChildren(
  nodes: readonly UINode[],
  context: RenderContext
): IterableIterator<string> {
  for (const node of nodes) {
    yield* render(node, context);
  }
}

function* renderBlockChildren(
  nodes: readonly UINode[],
  context: RenderContext,
  indent: string = ""
): IterableIterator<string> {
  for (const node of nodes) {
    for (const chunk of render(node, context)) {
      yield indent + chunk + "\n";
    }
  }
}
