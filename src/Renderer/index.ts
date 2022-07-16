import { UINode } from "../UITree/UINode.js";
import { splitByLines } from "../util/textIterator/splitByLines.js";
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
      yield* renderBlockChildren(
        node.children,
        context,
        header ? node.renderIndent(context, node.rawNode) : ""
      );
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
      yield node.renderMarker(context, node.rawNode);
      yield* renderInlineChildren(node.children, context);
      yield "\n";
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
  let isFirst = true;
  for (const node of nodes) {
    if (isFirst) {
      isFirst = false;
    } else {
      yield " ";
    }
    yield* render(node, context);
  }
}

function* renderBlockChildren(
  nodes: readonly UINode[],
  context: RenderContext,
  indent: string = ""
): IterableIterator<string> {
  for (const node of nodes) {
    for (const line of splitByLines(render(node, context))) {
      yield indent + line + "\n";
    }
  }
}
