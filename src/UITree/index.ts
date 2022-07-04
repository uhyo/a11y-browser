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
  const result: UINodeInTree = {
    ...selfNode,
    intrinsicFlow: flowMax(children),
    children,
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
    case "IframePresentational": {
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
    case "generic": {
      return {
        type: "generic",
        selfFlow: "inline",
      };
    }
    case "paragraph":
    case "search": {
      return {
        type: "generic",
        selfFlow: "block",
      };
    }
    case "RootWebArea": {
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
      if (!name) {
        return undefined;
      }
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
      const name = rawNode.name?.value;
      return {
        type: "list",
        selfFlow: "block",
        name: name ?? "",
      };
    }
    case "listitem": {
      return {
        type: "listitem",
        selfFlow: "inline",
      };
    }
    default: {
      console.debug(`⚠️ Unknown role: ${role}`);
      console.debug(inspect(rawNode, { depth: 10 }));
      return {
        type: "generic",
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
 * If any of nodes contain block flow, aligns all nodes to "block" and returns "block".
 */
function flowMax(nodes: readonly UINodeInTree[]): UIFlow {
  const result = nodes.some(({ selfFlow, intrinsicFlow }) => {
    return selfFlow === "block" || intrinsicFlow === "block";
  });
  if (!result) {
    return "inline";
  }
  for (const node of nodes) {
    node.selfFlow = "block";
  }
  return "block";
}
