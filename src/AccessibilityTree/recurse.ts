import { CDPObject } from "../Browser/CDPEvents/index.js";
import { globalLogger } from "../Logger/global.js";
import { checkAbort } from "../util/abort.js";
import { AXNode } from "./AccessibilityNode.js";

/**
 * Recurse until whole tree is fetched.
 */
export async function* recurse(
  signal: AbortSignal,
  cdp: CDPObject,
  parent: AXNode
): AsyncGenerator<AXNode | undefined, void, unknown> {
  // fetch children
  checkAbort(signal);
  const { nodes } = await cdp.send("Accessibility.getChildAXNodes", {
    id: parent.nodeId,
  });
  checkAbort(signal);
  yield;
  checkAbort(signal);
  // According to experimental results, children of node with `ignored: false` are not included in the result.
  const recs = await Promise.all(
    nodes.map(async (node) => {
      if (node.ignored) {
        return {
          node,
        };
      }
      const gen = recurse(signal, cdp, node);
      await gen.next();
      return {
        node,
        gen,
      };
    })
  );
  for (const { node, gen } of recs) {
    globalLogger.debug("recurse", node.nodeId);
    yield node;
    if (gen) {
      yield* gen;
    }
  }
}
