import { CDPSession } from "puppeteer";
import { AXNode } from "./AccessibilityNode.js";

/**
 * Recurse until whole tree is fetched.
 */
export async function* recurse(
  cdp: CDPSession,
  parent: AXNode
): AsyncGenerator<AXNode, void, unknown> {
  // fetch children
  const { nodes } = await cdp.send("Accessibility.getChildAXNodes", {
    id: parent.nodeId,
  });
  // According to experimental results, children of node with `ignored: false` are not included in the result.
  for (const next of nodes) {
    yield next;
    if (next.ignored) {
      continue;
    }
    yield* recurse(cdp, next);
  }
}
