import { Protocol } from "devtools-protocol";
import { inspect } from "util";
import {
  AccessibilityNode,
  AXNode,
} from "../AccessibilityTree/AccessibilityNode.js";
import { UIFlow, UINode, UINodeInTree } from "./UINode.js";

export function constructUITree(node: AccessibilityNode): UINodeInTree[] {
  const selfNode = convertSelf(node);
  const children = node.children.flatMap((child) => constructUITree(child));
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

function convertSelf(node: AccessibilityNode): UINode | undefined {
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
      return {
        type: "heading",
        level: Number(getProperty(rawNode, "level", 0)),
        selfFlow: "block",
        name: rawNode.name?.value,
      };
    }
    case "link": {
      return {
        type: "link",
        selfFlow: "inline",
        name: rawNode.name?.value,
      };
    }
    case "generic":
    case "time":
    case "alert":
    case "tooltip": {
      return {
        type: "generic",
        name: rawNode.name?.value,
        selfFlow: "inline",
      };
    }
    case "paragraph": {
      return {
        type: "generic",
        name: rawNode.name?.value,
        selfFlow: "block",
      };
    }
    case "RootWebArea":
    case "Section": {
      return {
        type: "section",
        selfFlow: "block",
        name: rawNode.name?.value,
      };
    }
    case "StaticText": {
      return {
        type: "text",
        selfFlow: "inline",
        name: rawNode.name?.value,
        value: rawNode.name?.value,
      };
    }
    case "button": {
      return {
        type: "button",
        selfFlow: "inline",
        name: rawNode.name?.value,
      };
    }
    case "img": {
      const name = rawNode.name?.value;
      return {
        type: "image",
        selfFlow: "inline",
        name,
      };
    }
    case "combobox": {
      const name = rawNode.name?.value;
      return {
        type: "input",
        selfFlow: "inline",
        name: name ?? "",
        hasPopup: getProperty(rawNode, "hasPopup", "false") !== "false",
      };
    }
    case "list": {
      return {
        type: "list",
        selfFlow: "block",
        name: rawNode.name?.value,
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
function alignFlow(nodes: UINodeInTree[]): {
  flow: UIFlow;
  nodes: UINodeInTree[];
} {
  if (nodes.every(nodeRendersInline)) {
    return {
      flow: "inline",
      nodes,
    };
  }
  let chunk: UINodeInTree[] = [];
  const result: UINodeInTree[] = [];
  for (const node of nodes) {
    if (nodeRendersInline(node)) {
      chunk.push(node);
    } else {
      if (chunk.length > 0) {
        result.push({
          type: "generic",
          name: undefined,
          selfFlow: "block",
          intrinsicFlow: "inline",
          children: chunk,
        });
        chunk = [];
      }
      result.push(node);
    }
  }
  if (chunk.length > 0) {
    result.push({
      type: "generic",
      name: undefined,
      selfFlow: "block",
      intrinsicFlow: "inline",
      children: chunk,
    });
  }
  return {
    flow: "block",
    nodes: result,
  };
}

/**
 * Determines whether given node is to be rendered inline.
 */
function nodeRendersInline(node: UINodeInTree): boolean {
  return node.selfFlow === "inline" && node.intrinsicFlow === "inline";
}
