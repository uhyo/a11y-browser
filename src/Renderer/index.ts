import { UINodeInTree } from "../UITree/UINode.js";
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
      const name = node.name?.trim();
      if (name) {
        if (node.intrinsicFlow === "inline") {
          result += context.theme.supplemental(`(${name})`);
        } else {
          result += context.theme.supplemental(`(${name})`) + "\n";
        }
      }
      if (node.intrinsicFlow === "inline") {
        result += renderInlineChildren(node.children, context);
      } else {
        result += renderBlockChildren(node.children, context);
      }
      break;
    }
    case "link": {
      if (node.intrinsicFlow === "inline") {
        const name = node.name?.trim();
        const content = renderInlineChildren(node.children, context);
        result += context.theme.link(
          `<Link:${maybeUndefinedAnd(
            name !== content && node.name?.trim(),
            "",
            content ? " " : ""
          )}${content}>`
        );
        break;
      } else {
        const header =
          context.theme.link(`<Link:${node.name?.trim() ?? ""}>`) + "\n";
        result += header;

        context.shouldPrintBlockSeparator = false;
        const body = renderBlockChildren(
          node.children,
          context,
          context.theme.link("|") + " "
        );

        result += body;
        context.shouldPrintBlockSeparator = true;
        break;
      }
    }
    case "heading": {
      const headerMark = node.level <= 0 ? "#?" : "#".repeat(node.level);
      if (node.intrinsicFlow === "inline") {
        result += context.theme.heading(
          `${headerMark} ${renderInlineChildren(node.children, context)}`
        );
        break;
      } else {
        const header =
          context.theme.heading(`${headerMark} ${node.name?.trim() ?? ""}`) +
          "\n";
        result += header;

        context.shouldPrintBlockSeparator = false;
        const body = renderBlockChildren(
          node.children,
          context,
          context.theme.heading("|") + " "
        );

        result += body;
        context.shouldPrintBlockSeparator = true;
        break;
      }
    }
    case "button": {
      result += context.theme.button(`[Button: ${node.name?.trim() ?? ""}]`);
      break;
    }
    case "image": {
      result += context.theme.image(`[Image: ${node.name?.trim() ?? ""}]`);
      break;
    }
    case "input": {
      result += context.theme.button(
        `[Input${maybeUndefinedAnd(
          node.name?.trim(),
          "(",
          ")"
        )} ${renderInlineChildren(node.children, context)}]`
      );
      break;
    }
    case "list": {
      result +=
        context.theme.structure(
          `List${maybeUndefinedAnd(node.name?.trim(), ": ")}`
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
        context.shouldPrintBlockSeparator = false;
        const body = renderBlockChildren(
          node.children,
          context,
          context.theme.structure("|") + " "
        );

        result += body;
        context.shouldPrintBlockSeparator = true;
        break;
      }
    }
    case "navigation":
    case "complementary":
    case "banner":
    case "contentinfo":
    case "article": {
      const header = node.type.charAt(0).toUpperCase() + node.type.slice(1);

      result +=
        context.theme.structure(
          `${header}${maybeUndefinedAnd(node.name?.trim(), " ")}`
        ) + "\n";
      context.shouldPrintBlockSeparator = false;
      const body = renderBlockChildren(
        node.children,
        context,
        context.theme.structure("|") + " "
      );

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

function renderInlineChildren(
  nodes: readonly UINodeInTree[],
  context: RenderContext
): string {
  return nodes.map((node) => render(node, context)).join("");
}

function renderBlockChildren(
  nodes: readonly UINodeInTree[],
  context: RenderContext,
  indent: string = ""
): string {
  const lines = nodes
    .map((node) => render(node, context))
    .join("")
    .split("\n");
  const res = lines.map((line) => indent + line).join("\n");
  context.shouldPrintBlockSeparator = true;
  return res;
}

function maybeUndefinedAnd(
  str: string | undefined | false,
  prefix = "",
  suffix = ""
): string {
  return !str ? "" : prefix + str + suffix;
}
