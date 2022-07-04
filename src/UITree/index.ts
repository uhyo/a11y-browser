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

function flowMax(nodes: readonly UINodeInTree[]): UIFlow {
  for (const { selfFlow, intrinsicFlow } of nodes) {
    if (intrinsicFlow === "block" || selfFlow === "block") {
      return "block";
    }
  }
  return "inline";
}
