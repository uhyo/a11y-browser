import { inspect } from "util";
import { AccessibilityNode } from "../AccessibilityTree/AccessibilityNode.js";
import { globalLogger } from "../Logger/global.js";
import { assertNever } from "../util/assertNever.js";
import {
  buttonInline,
  codeHeader,
  codeIndent,
  codeInline,
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
  preBlock,
  regionHeader,
  regionIndent,
  renderNothing,
  tableHeader,
  textInline,
} from "./nodeRenderers.js";
import {
  InlineUINode,
  IntermediateUINode,
  isUINode,
  UINode,
  UINodeBase,
} from "./UINode.js";

const emptyArray: readonly [] = [];

export function constructUITree(node: AccessibilityNode): UINode {
  const result = constructUITreeRec(node).map(toNonIntermediateUINode);
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

function constructUITreeRec(node: AccessibilityNode): IntermediateUINode[] {
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

type IntermediateUINodeWithoutBase = IntermediateUINode extends infer U
  ? U extends infer V
    ? Omit<V, keyof UINodeBase>
    : never
  : never;

function convertNode(
  node: AccessibilityNode,
  rawChildren: readonly IntermediateUINode[],
): IntermediateUINodeWithoutBase | undefined {
  const { rawNode, role } = node;
  if (rawNode.ignored) {
    return undefined;
  }
  switch (role) {
    case "table": {
      return {
        type: "table",
        renderHeader: tableHeader,
        rows: rawChildren.flatMap((child) => {
          if (child.type === "row") {
            return [child];
          }
          return [];
        }),
      };
    }
    case "row": {
      return {
        type: "row",
        cells: rawChildren.flatMap((child) => {
          if (child.type === "cell") {
            return [child];
          }
          return [];
        }),
      };
    }
    case "cell":
    case "gridcell": {
      return {
        type: "cell",
        children: rawChildren.map(toNonIntermediateUINode),
      };
    }
  }
  // Other roles do not need handling of intermediate nodes.
  const children = rawChildren.map(toNonIntermediateUINode);
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
    case "code": {
      if (children.every(isInlineNode)) {
        return {
          type: "inline",
          render: codeInline,
          children,
        };
      }
      return {
        type: "wrapper",
        renderHeader: codeHeader,
        renderIndent: codeIndent,
        children,
      };
    }
    case "generic":
    case "time":
    case "alert":
    case "tooltip":
    case "LayoutTableCell": {
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
    case "Section":
    case "HeaderAsNonLandmark":
    case "LayoutTable":
    case "LayoutTableRow": {
      return {
        type: "wrapper",
        renderHeader: genericHeader,
        renderIndent: genericIndent,
        children,
      };
    }
    case "Pre": {
      // Chromium-internal role for Pre texts.
      return {
        type: "block",
        render: preBlock,
        children,
      };
    }
    case "StaticText":
    case "ListMarker": {
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
      const hasListMarker = children.some(
        (child) => child.rawNode?.role?.value === "ListMarker",
      );
      return {
        type: "listitem",
        renderMarker: hasListMarker ? renderNothing : listMarker,
        children,
      };
    }
    case "navigation":
    case "complementary":
    case "banner":
    case "contentinfo":
    case "article":
    case "search":
    case "main": {
      return {
        type: "wrapper",
        renderHeader: regionHeader,
        renderIndent: regionIndent,
        children,
      };
    }
    default: {
      globalLogger.error(`⚠️ Unknown role: ${role}`);
      globalLogger.error(inspect(rawNode, { depth: 10 }));
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

function toNonIntermediateUINode(node: IntermediateUINode): UINode {
  if (isUINode(node)) {
    return node;
  }
  switch (node.type) {
    case "row": {
      return {
        type: "block",
        render: genericBlock,
        children: node.cells.map(toNonIntermediateUINode),
        focused: node.focused,
        rawNode: node.rawNode,
      };
    }
    case "cell": {
      return {
        type: "inline",
        render: genericInline,
        children: node.children.map(toNonIntermediateUINode),
        focused: node.focused,
        rawNode: node.rawNode,
      };
    }
    default: {
      assertNever(node);
    }
  }
}
