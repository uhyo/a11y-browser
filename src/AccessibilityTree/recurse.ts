import { CDPSession } from "puppeteer";
import { AXNode } from "./AccessibilityNode.js";

/**
 * Recurse until whole tree is fetched.
 */
export async function* recurse(
  cdp: CDPSession,
  parent: AXNode
): AsyncGenerator<AXNode | undefined, void, unknown> {
  // fetch children
  const { nodes } = await cdp.send("Accessibility.getChildAXNodes", {
    id: parent.nodeId,
  });
  yield;
  // According to experimental results, children of node with `ignored: false` are not included in the result.
  const recs = await Promise.all(
    nodes.map(async (node) => {
      if (node.ignored) {
        return {
          node,
        };
      }
      const gen = recurse(cdp, node);
      await gen.next();
      return {
        node,
        gen,
      };
    })
  );
  for (const { node, gen } of recs) {
    yield node;
    if (gen) {
      yield* gen;
    }
  }
}
