import { on } from "events";
import { AccessibilityTree } from "../../AccessibilityTree/index.js";

export function getAXNodeUpdateStream(
  tree: AccessibilityTree
): [AsyncIterableIterator<void>, () => void] {
  const abortController = new AbortController();
  const cleanup = () => {
    abortController.abort();
  };
  return [
    on(tree.treeEvent, "update", {
      signal: abortController.signal,
    }),
    cleanup,
  ];
}
