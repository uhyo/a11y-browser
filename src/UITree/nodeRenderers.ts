import { Protocol } from "devtools-protocol";
import { AXNode } from "../AccessibilityTree/AccessibilityNode.js";
import { mapIterator } from "../util/iterator/mapIterator.js";
import { addNewLineToEnd } from "../util/textIterator/addNewLineToEnd.js";
import { ParentRenderer, StandaloneRenderer } from "./UINode.js";

export const genericInline: ParentRenderer = function* (
  context,
  rawNode,
  child
) {
  const name = getName(rawNode);
  if (name) {
    yield context.theme.supplemental(`(${name}: `);
  }
  yield* child;
  if (name) {
    yield context.theme.supplemental(")");
  }
};

export const genericBlock: ParentRenderer = function* (
  context,
  rawNode,
  child
) {
  const name = getName(rawNode);
  if (name) {
    yield context.theme.supplemental(`(${name})`) + "\n";
  }
  yield* addNewLineToEnd(child);
};

export const genericHeader: StandaloneRenderer = (context, rawNode) => {
  const name = getName(rawNode);
  return name ? context.theme.supplemental(name) : "";
};

export const textInline: ParentRenderer = function* (context, rawNode) {
  yield getName(rawNode) ?? "";
};

export const headingBlock: ParentRenderer = function* (
  context,
  rawNode,
  child
) {
  const level = Number(getProperty(rawNode, "level", 0));
  const headerMark = level <= 0 ? "#?" : "#".repeat(level);
  yield context.theme.heading(`${headerMark} `);
  yield* mapIterator(child, context.theme.heading);
  yield "\n";
};

export const headingHeader: StandaloneRenderer = (context, rawNode) => {
  const level = Number(getProperty(rawNode, "level", 0));
  const headerMark = level <= 0 ? "#?" : "#".repeat(level);
  return context.theme.heading(
    headerMark + maybeUndefinedAnd(getName(rawNode), " ")
  );
};

export const linkInline: ParentRenderer = function* (context, rawNode, child) {
  const name = getName(rawNode)?.trim();
  if (name) {
    yield context.theme.link(`<Link: ${name}>`);
  } else {
    yield context.theme.link("<Link: ");
    yield* mapIterator(child, context.theme.link);
    yield context.theme.link(">");
  }
};

export const linkHeader: StandaloneRenderer = (context, rawNode) => {
  const name = getName(rawNode);
  return context.theme.link(`<Link:${name?.trim() ?? ""}>`);
};

export const buttonInline: ParentRenderer = function* (
  context,
  rawNode,
  child
) {
  const name = getName(rawNode)?.trim();
  if (name) {
    yield context.theme.button(`[Button(${name})]`);
  } else {
    yield context.theme.button("[Button: ");
    yield* mapIterator(child, context.theme.button);
    yield context.theme.button("]");
  }
};

export const imageInline: ParentRenderer = function* (context, rawNode) {
  const name = getName(rawNode)?.trim();
  if (name) {
    yield context.theme.image(`[Image: ${name}]`);
  } else {
    yield context.theme.image("[Unknown Image]");
  }
};

export const comboBoxInline: ParentRenderer = function* (
  context,
  rawNode,
  child
) {
  const name = getName(rawNode)?.trim();
  if (name) {
    yield context.theme.button(`[Input(${name})]`);
  } else {
    yield context.theme.button("[Input: ");
    yield* mapIterator(child, context.theme.button);
    yield context.theme.button("]");
  }
};

export const listHeader: StandaloneRenderer = (context, rawNode) => {
  const name = getName(rawNode)?.trim();
  return context.theme.structure(`List${maybeUndefinedAnd(name, ": ")}`);
};

export const listMarker: StandaloneRenderer = (context, rawNode) => {
  return context.theme.structure("- ");
};

export const regionHeader: StandaloneRenderer = (context, rawNode) => {
  const role: string = rawNode?.role?.value ?? "";
  const header = role.charAt(0).toUpperCase() + role.slice(1);
  return context.theme.structure(
    header + maybeUndefinedAnd(getName(rawNode), " ")
  );
};

function getProperty(
  node: AXNode | undefined,
  name: Protocol.Accessibility.AXPropertyName,
  defaultValue: unknown
): unknown {
  return (
    node?.properties?.find((p) => p.name === name)?.value.value ?? defaultValue
  );
}

/**
 * Get accessible name of a node.
 */
function getName(node: AXNode | undefined): string | undefined {
  return node?.name?.value;
}

/**
 * Applies prefix and suffix when given string is not empty.
 */
function maybeUndefinedAnd(
  str: string | undefined | false,
  prefix = "",
  suffix = ""
): string {
  return !str ? "" : prefix + str + suffix;
}
