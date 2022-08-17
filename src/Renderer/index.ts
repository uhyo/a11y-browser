import { UINode } from "../UITree/UINode.js";
import { splitByLines } from "../util/textIterator/splitByLines.js";
import { indentMarkerEnd, indentMarkerStart } from "./indentMarker.js";
import { RenderContext } from "./RenderContext.js";

/**
 * Render given node.
 */
export function* render(
  node: UINode,
  context: RenderContext
): IterableIterator<string> {
  if (
    node.type === "wrapper" ||
    node.type === "block" ||
    node.type === "table"
  ) {
    if (context.shouldPrintBlockSeparator) {
      yield "\n";
      context.shouldPrintBlockSeparator = false;
    }
  }
  const startLine = context.getLineNumber();
  switch (node.type) {
    case "wrapper": {
      const header = node.renderHeader(context, node.rawNode);
      if (header) {
        if (node.focused) {
          yield context.theme.focused("[") +
            header +
            context.theme.focused("]") +
            "\n";
        } else {
          yield header + "\n";
        }
        // Notify a start of indent
        yield indentMarkerStart +
          node.renderIndent(context, node.rawNode) +
          "\n";
      }
      yield* renderBlockChildren(node.children, context);
      if (header) {
        // Notify an end of indent
        yield indentMarkerEnd + "\n";
      }
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
      if (node.focused) {
        yield context.theme.focused("[");
      }
      yield* renderInlineChildren(node.children, context);
      if (node.focused) {
        yield context.theme.focused("]");
      }
      yield "\n";
      context.shouldPrintBlockSeparator = true;
      break;
    }
    case "inline": {
      const children = renderInlineChildren(node.children, context);
      if (node.focused) {
        yield context.theme.focused("[");
      }
      yield* node.render(context, node.rawNode, children);
      if (node.focused) {
        yield context.theme.focused("]");
      }
      context.shouldPrintBlockSeparator = false;
      break;
    }
    case "table": {
      yield node.renderHeader(context, node.rawNode) + "\n";
      context.shouldPrintBlockSeparator = true;
      break;
    }
  }
  const endLine = context.getLineNumber();
  node.renderedPosition = {
    start: startLine,
    end: endLine,
  };
  if (node.focused) {
    context.onFocusedNode(node);
  }
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
  context: RenderContext
): IterableIterator<string> {
  for (const node of nodes) {
    for (const line of splitByLines(render(node, context))) {
      yield line + "\n";
    }
  }
}
