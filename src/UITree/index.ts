import { inspect } from "util";
import { AccessibilityNode } from "../AccessibilityTree/AccessibilityNode.js";
import {
  buttonInline,
  comboBoxInline,
  genericBlock,
  genericHeader,
  genericIndent,
  genericInline,
  getProperty,
  headingBlock,
  headingHeader,
  headingIndent,
  imageInline,
  linkHeader,
  linkIndent,
  linkInline,
  listHeader,
  listIndent,
  listMarker,
  regionHeader,
  regionIndent,
  textInline,
} from "./nodeRenderers.js";
import { InlineUINode, UINode, UINodeBase } from "./UINode.js";

const emptyArray: readonly [] = [];

export function constructUITree(node: AccessibilityNode): UINode {
  const result = constructUITreeRec(node);
  if (result.length === 1) {
    return result[0]!;
  }

  const children = result.some(isInlineNode) ? getBlockList(result) : result;
  return {
    type: "block",
    render: genericBlock,
    children,
    focused: false,
  };
}

function constructUITreeRec(node: AccessibilityNode): UINode[] {
  const children = node.children.flatMap((child) => constructUITreeRec(child));

  const uiNode = convertNode(node, children);
  if (uiNode === undefined) {
    return children;
  }
  switch (uiNode.type) {
    case "wrapper": {
      uiNode.children = getBlockList(uiNode.children);
      break;
    }
  }
  Object.defineProperties(uiNode, {
    focused: {
      value: !!getProperty(node.rawNode, "focused", false),
      writable: true,
      enumerable: true,
      configurable: true,
    },
    rawNode: {
      value: node.rawNode,
      writable: true,
      enumerable: false,
      configurable: true,
    },
  });
  return [uiNode as UINode];
}

type UINodeWithoutBase = UINode extends infer U
  ? U extends infer V
    ? Omit<V, keyof UINodeBase>
    : never
  : never;

function convertNode(
  node: AccessibilityNode,
  children: readonly UINode[]
): UINodeWithoutBase | undefined {
  const { rawNode, role } = node;
  if (rawNode.ignored) {
    return undefined;
  }
  switch (role) {
    case "none":
    case "IframePresentational":
    case "LineBreak":
    case "RootWebArea": {
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
        renderIndent: headingIndent,
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
        renderIndent: linkIndent,
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
        renderIndent: genericIndent,
        children,
      };
    }
    case "paragraph": {
      return {
        type: "wrapper",
        renderHeader: genericHeader,
        renderIndent: genericIndent,
        children,
      };
    }
    case "Section": {
      return {
        type: "wrapper",
        renderHeader: genericHeader,
        renderIndent: genericIndent,
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
        renderIndent: listIndent,
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
        renderIndent: regionIndent,
        children,
      };
    }
    default: {
      console.debug(`⚠️ Unknown role: ${role}`);
      console.debug(inspect(rawNode, { depth: 10 }));
      return {
        type: "wrapper",
        renderHeader: genericHeader,
        renderIndent: genericIndent,
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
          focused: false,
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
      focused: false,
    });
  }
  return result;
}

function isInlineNode(node: UINode): node is InlineUINode {
  return node.type === "inline";
}
