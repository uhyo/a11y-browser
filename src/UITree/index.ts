import { Protocol } from "devtools-protocol";
import { inspect } from "util";
import {
  AccessibilityNode,
  AXNode,
} from "../AccessibilityTree/AccessibilityNode.js";
import {
  buttonInline,
  comboBoxInline,
  genericHeader,
  genericInline,
  headingHeader,
  headingInline,
  imageInline,
  linkHeader,
  linkInline,
  listHeader,
  textInline,
} from "./nodeRenderers.js";
import { InlineUINode, UINode } from "./UINode.js";

const emptyArray: readonly [] = [];

export function constructUITree(node: AccessibilityNode): UINode[] {
  const children = node.children.flatMap((child) => constructUITree(child));

  const selfNode = convertSelf(node, children);
  if (selfNode === undefined) {
    return children;
  }
  const { flow: intrinsicFlow, nodes } = alignFlow(children);
  const result: UINodeInTree = {
    ...selfNode,
    intrinsicFlow,
    children: nodes,
  };
  return [result];
}

function convertSelf(
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
          type: "inline",
          render: headingInline,
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
        type: "block",
        children,
      };
    }
    case "RootWebArea":
    case "Section": {
      return {
        type: "block",
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
        name: rawNode.name?.value,
        selfFlow: "inline",
      };
    }
    case "navigation":
    case "complementary":
    case "banner":
    case "contentinfo":
    case "article":
    case "search": {
      return {
        type: role,
        selfFlow: "block",
        name: rawNode.name?.value ?? "",
      };
    }
    default: {
      console.debug(`⚠️ Unknown role: ${role}`);
      console.debug(inspect(rawNode, { depth: 10 }));
      return {
        type: "generic",
        name: rawNode.name?.value,
        selfFlow: "inline",
      };
    }
  }
}

function getProperty(
  node: AXNode,
  name: Protocol.Accessibility.AXPropertyName,
  defaultValue: unknown
): unknown {
  return (
    node.properties?.find((p) => p.name === name)?.value.value ?? defaultValue
  );
}

/**
 * If given nodes are mix of inline and block flow, wraps inline nodes with a generic block node.
 */
function getBlockList(nodes: UINode[]): UINode[] {
  let chunk: UINode[] = [];
  const result: UINode[] = [];
  for (const node of nodes) {
    if (node.type === "inline") {
      chunk.push(node);
    } else {
      if (chunk.length > 0) {
        result.push({
          type: "block",
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
      children: chunk,
    });
  }
  return result;
}

function isInlineNode(node: UINode): node is InlineUINode {
  return node.type === "inline";
}
