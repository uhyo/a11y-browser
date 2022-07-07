import { inspect } from "util";
import { AccessibilityNode } from "../AccessibilityTree/AccessibilityNode.js";
import {
  buttonInline,
  comboBoxInline,
  genericBlock,
  genericHeader,
  genericInline,
  headingBlock,
  headingHeader,
  imageInline,
  linkHeader,
  linkInline,
  listHeader,
  listMarker,
  regionHeader,
  textInline,
} from "./nodeRenderers.js";
import { InlineUINode, UINode } from "./UINode.js";

const emptyArray: readonly [] = [];

export function constructUITree(node: AccessibilityNode): UINode[] {
  const children = node.children.flatMap((child) => constructUITree(child));

  const uiNode = convertNode(node, children);
  if (uiNode === undefined) {
    return children;
  }
  Object.defineProperty(uiNode, "rawNode", {
    value: node.rawNode,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  switch (uiNode.type) {
    case "wrapper": {
      uiNode.children = getBlockList(uiNode.children);
      break;
    }
  }
  return [uiNode];
}

function convertNode(
  node: AccessibilityNode,
  children: readonly UINode[]
): UINode | undefined {
  const { rawNode, role } = node;
  if (rawNode.ignored) {
    return undefined;
  }
  switch (role) {
    case "none":
    case "IframePresentational":
    case "LineBreak": {
      return undefined;
    }
    case "heading": {
      if (children.every(isInlineNode)) {
        return {
          type: "block",
          render: headingBlock,
          children,
        };
      }
      return {
        type: "wrapper",
        renderHeader: headingHeader,
        children,
      };
    }
    case "link": {
      if (children.every(isInlineNode)) {
        return {
          type: "inline",
          render: linkInline,
          children,
        };
      }
      return {
        type: "wrapper",
        renderHeader: linkHeader,
        children,
      };
    }
    case "generic":
    case "time":
    case "alert":
    case "tooltip": {
      if (children.every(isInlineNode)) {
        return {
          type: "inline",
          render: genericInline,
          children,
        };
      }
      return {
        type: "wrapper",
        renderHeader: genericHeader,
        children,
      };
    }
    case "paragraph": {
      return {
        type: "wrapper",
        renderHeader: genericHeader,
        children,
      };
    }
    case "RootWebArea":
    case "Section": {
      return {
        type: "wrapper",
        renderHeader: genericHeader,
        children,
      };
    }
    case "StaticText": {
      return {
        type: "inline",
        render: textInline,
        children: emptyArray,
      };
    }
    case "button": {
      return {
        type: "inline",
        render: buttonInline,
        children,
      };
    }
    case "img": {
      return {
        type: "inline",
        render: imageInline,
        children: emptyArray,
      };
    }
    case "combobox": {
      return {
        type: "inline",
        render: comboBoxInline,
        children,
      };
    }
    case "list": {
      return {
        type: "wrapper",
        renderHeader: listHeader,
        children,
      };
    }
    case "listitem": {
      return {
        type: "listitem",
        renderMarker: listMarker,
        children,
      };
    }
    case "navigation":
    case "complementary":
    case "banner":
    case "contentinfo":
    case "article":
    case "search": {
      return {
        type: "wrapper",
        renderHeader: regionHeader,
        children,
      };
    }
    default: {
      console.debug(`⚠️ Unknown role: ${role}`);
      console.debug(inspect(rawNode, { depth: 10 }));
      return {
        type: "wrapper",
        renderHeader: genericHeader,
        children,
      };
    }
  }
}

/**
 * If given nodes are mix of inline and block flow, wraps inline nodes with a generic block node.
 */
function getBlockList(nodes: readonly UINode[]): UINode[] {
  let chunk: UINode[] = [];
  const result: UINode[] = [];
  for (const node of nodes) {
    if (node.type === "inline") {
      chunk.push(node);
    } else {
      if (chunk.length > 0) {
        result.push({
          type: "block",
          render: genericBlock,
          children: chunk,
        });
        chunk = [];
      }
      result.push(node);
    }
  }
  if (chunk.length > 0) {
    result.push({
      type: "block",
      render: genericBlock,
      children: chunk,
    });
  }
  return result;
}

function isInlineNode(node: UINode): node is InlineUINode {
  return node.type === "inline";
}
