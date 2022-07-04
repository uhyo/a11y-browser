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
    case "section":
    case "listitem": {
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
    case "input": {
      result += context.theme.button(
        `[Input(${node.name.trim()}) ${renderChildren(
          "inline",
          node.children,
          context
        )}]`
      );
      break;
    }
    case "list": {
      result +=
        context.theme.structure(
          `List${node.name ? `: ${node.name.trim()}` : ""}`
        ) + "\n";
      if (node.intrinsicFlow === "inline") {
        for (const child of node.children) {
          if (child.type === "listitem") {
            result +=
              context.theme.structure("- ") + render(child, context) + "\n";
          } else {
            result += render(child, context) + "\n";
          }
        }
        context.shouldPrintBlockSeparator = true;
        break;
      } else {
        const oldIndent = context.blockIndent;
        context.blockIndent = context.theme.structure("|") + " " + oldIndent;
        context.shouldPrintBlockSeparator = false;
        const body = renderChildren("block", node.children, context);
        context.blockIndent = oldIndent;

        result += body;
        context.shouldPrintBlockSeparator = true;
        break;
      }
    }
    case "navigation":
    case "complementary":
    case "banner":
    case "contentinfo": {
      const header =
        node.type === "navigation"
          ? "Navigation"
          : node.type === "complementary"
          ? "Complementary"
          : node.type === "banner"
          ? "Banner"
          : "Contentinfo";

      result +=
        context.theme.structure(
          `${header} ${node.name ? `: ${node.name.trim()}` : ""}`
        ) + "\n";
      const oldIndent = context.blockIndent;
      context.blockIndent = context.theme.structure("|") + " " + oldIndent;
      context.shouldPrintBlockSeparator = false;
      const body = renderChildren("block", node.children, context);
      context.blockIndent = oldIndent;

      result += body;
      context.shouldPrintBlockSeparator = true;
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
