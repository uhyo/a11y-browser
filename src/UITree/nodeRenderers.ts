import { Protocol } from "devtools-protocol";
import { AXNode } from "../AccessibilityTree/AccessibilityNode.js";
import { HeaderRenderer, InlineRenderer } from "./UINode.js";

export const genericInline: InlineRenderer = (context, rawNode, child) => {
  const name = getName(rawNode);
  if (name && name !== child) {
    return (
      context.theme.supplemental(`(${name}: `) +
      child +
      context.theme.supplemental(")")
    );
  }
  return child;
};

export const genericHeader: HeaderRenderer = (context, rawNode) => {
  const name = getName(rawNode);
  return context.theme.supplemental(name ?? "");
};

export const textInline: InlineRenderer = (context, rawNode) => {
  return getName(rawNode) ?? "";
};

export const headingInline: InlineRenderer = (context, rawNode, child) => {
  const level = Number(getProperty(rawNode, "level", 0));
  const headerMark = level <= 0 ? "#?" : "#".repeat(level);
  return context.theme.heading(headerMark) + " " + child;
};

export const headingHeader: HeaderRenderer = (context, rawNode) => {
  const level = Number(getProperty(rawNode, "level", 0));
  const headerMark = level <= 0 ? "#?" : "#".repeat(level);
  return (
    context.theme.heading(headerMark) + maybeUndefinedAnd(getName(rawNode), " ")
  );
};

export const linkInline: InlineRenderer = (context, rawNode, child) => {
  const name = getName(rawNode);
  return context.theme.link(
    `<Link:${maybeUndefinedAnd(
      name !== child && name?.trim(),
      "",
      child ? " " : ""
    )}${child}>`
  );
};

export const linkHeader: HeaderRenderer = (context, rawNode) => {
  const name = getName(rawNode);
  return context.theme.link(`<Link:${name?.trim() ?? ""}>`);
};

export const buttonInline: InlineRenderer = (context, rawNode, child) => {
  const name = getName(rawNode);
  return context.theme.button(
    `[Button${maybeUndefinedAnd(
      name !== child && name?.trim(),
      "(",
      ")"
    )}${maybeUndefinedAnd(child, ": ")}]`
  );
};

export const imageInline: InlineRenderer = (context, rawNode) => {
  const name = getName(rawNode)?.trim();
  if (!name) {
    return context.theme.image("[Unknown Image]");
  }
  return context.theme.image(`[Image: ${name}]`);
};

export const comboBoxInline: InlineRenderer = (context, rawNode, child) => {
  const name = getName(rawNode)?.trim();
  return context.theme.button(
    `[Input${maybeUndefinedAnd(name, "(", ")")} ${child}]`
  );
};

export const listHeader: HeaderRenderer = (context, rawNode) => {
  const name = getName(rawNode)?.trim();
  return context.theme.structure(`List${maybeUndefinedAnd(name, ": ")}`);
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
