import { Protocol } from "devtools-protocol";
import { AXNode } from "../AccessibilityTree/AccessibilityNode.js";
import { ParentRenderer, StandaloneRenderer } from "./UINode.js";

export const genericInline: ParentRenderer = (context, rawNode, child) => {
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

export const genericBlock: ParentRenderer = (context, rawNode, child) => {
  const name = getName(rawNode);
  if (name) {
    return (
      context.theme.supplemental(`(${name}: `) +
      child +
      context.theme.supplemental(")") +
      "\n"
    );
  }
  return child + "\n";
};

export const genericHeader: StandaloneRenderer = (context, rawNode) => {
  const name = getName(rawNode);
  return context.theme.supplemental(name ?? "");
};

export const textInline: ParentRenderer = (context, rawNode) => {
  return getName(rawNode) ?? "";
};

export const headingBlock: ParentRenderer = (context, rawNode, child) => {
  const level = Number(getProperty(rawNode, "level", 0));
  const headerMark = level <= 0 ? "#?" : "#".repeat(level);
  return context.theme.heading(`${headerMark} ${child}`) + "\n";
};

export const headingHeader: StandaloneRenderer = (context, rawNode) => {
  const level = Number(getProperty(rawNode, "level", 0));
  const headerMark = level <= 0 ? "#?" : "#".repeat(level);
  return context.theme.heading(
    headerMark + maybeUndefinedAnd(getName(rawNode), " ")
  );
};

export const linkInline: ParentRenderer = (context, rawNode, child) => {
  const name = getName(rawNode);
  return context.theme.link(
    `<Link:${maybeUndefinedAnd(
      name !== child && name?.trim(),
      "",
      child ? " " : ""
    )}${child}>`
  );
};

export const linkHeader: StandaloneRenderer = (context, rawNode) => {
  const name = getName(rawNode);
  return context.theme.link(`<Link:${name?.trim() ?? ""}>`);
};

export const buttonInline: ParentRenderer = (context, rawNode, child) => {
  const name = getName(rawNode);
  return context.theme.button(
    `[Button${maybeUndefinedAnd(
      name !== child && name?.trim(),
      "(",
      ")"
    )}${maybeUndefinedAnd(child, ": ")}]`
  );
};

export const imageInline: ParentRenderer = (context, rawNode) => {
  const name = getName(rawNode)?.trim();
  if (!name) {
    return context.theme.image("[Unknown Image]");
  }
  return context.theme.image(`[Image: ${name}]`);
};

export const comboBoxInline: ParentRenderer = (context, rawNode, child) => {
  const name = getName(rawNode)?.trim();
  return context.theme.button(
    `[Input${maybeUndefinedAnd(name, "(", ")")} ${child}]`
  );
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
