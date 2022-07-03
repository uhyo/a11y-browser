import { UIFlow, UINodeInTree } from "../UITree/UINode.js";
import { assertNever } from "../util/assertNever.js";
import { createDefaultContext, RenderContext } from "./RenderContext.js";

/**
 * Render given node.
 */
export function render(
  node: UINodeInTree,
  context: RenderContext = createDefaultContext()
): string {
  let result = "";
  if (node.selfFlow === "block" && context.shouldPrintBlockSeparator) {
    result += "\n";
    context.shouldPrintBlockSeparator = false;
  }
  switch (node.type) {
    case "text": {
      result += node.value.trim();
      break;
    }
    case "generic":
    case "section": {
      result += renderChildren(node.intrinsicFlow, node.children, context);
      break;
    }
    case "link": {
      if (node.intrinsicFlow === "inline") {
        result += context.theme.link(
          `<Link: ${renderChildren("inline", node.children, context)}>`
        );
        break;
      } else {
        const header = context.theme.link(`<Link: ${node.name.trim()}>`) + "\n";
        result += header;

        const oldIndent = context.blockIndent;
        context.blockIndent = context.theme.link("|") + " " + oldIndent;
        context.shouldPrintBlockSeparator = false;
        const body = renderChildren("block", node.children, context);
        context.blockIndent = oldIndent;

        result += body;
        context.shouldPrintBlockSeparator = true;
        break;
      }
    }
    case "heading": {
      const headerMark = node.level <= 0 ? "#?" : "#".repeat(node.level);
      if (node.intrinsicFlow === "inline") {
        result += context.theme.heading(
          `${headerMark} ${renderChildren("inline", node.children, context)}`
        );
        break;
      } else {
        const header =
          context.theme.heading(`${headerMark} ${node.name.trim()}`) + "\n";
        result += header;

        const oldIndent = context.blockIndent;
        context.blockIndent = context.theme.heading("|") + " " + oldIndent;
        context.shouldPrintBlockSeparator = false;
        const body = renderChildren("block", node.children, context);
        context.blockIndent = oldIndent;

        result += body;
        context.shouldPrintBlockSeparator = true;
        break;
      }
    }
    case "button": {
      result += context.theme.button(`[Button: ${node.name.trim()}]`);
      break;
    }
    case "image": {
      result += context.theme.image(`[Image: ${node.name.trim()}]`);
      break;
    }
    default: {
      assertNever(node);
    }
  }
  if (node.selfFlow === "block" && node.intrinsicFlow === "inline") {
    result += "\n";
    context.shouldPrintBlockSeparator = true;
  }
  return result;
}

function renderChildren(
  flow: UIFlow,
  nodes: readonly UINodeInTree[],
  context: RenderContext
): string {
  switch (flow) {
    case "inline": {
      return nodes.map((node) => render(node, context)).join("");
    }
    case "block": {
      const lines = nodes
        .map((node) => render(node, context))
        .join("")
        .split("\n");
      const res = lines.map((line) => context.blockIndent + line).join("\n");
      context.shouldPrintBlockSeparator = true;
      return res;
    }
  }
}
