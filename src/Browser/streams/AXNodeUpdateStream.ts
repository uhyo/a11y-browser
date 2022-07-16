import Protocol from "devtools-protocol";
import { EventEmitter, on } from "events";
import { CDPSession } from "puppeteer";
import { AXNode } from "../../AccessibilityTree/AccessibilityNode.js";

export function getAXNodeUpdateStream(
  cdp: CDPSession
): [AsyncIterableIterator<AXNode[]>, () => void] {
  const ev = new EventEmitter();
  const handler = (
    event: Protocol.Protocol.Accessibility.NodesUpdatedEvent
  ) => {
    ev.emit("update", event.nodes);
  };
  const abortController = new AbortController();
  cdp.on("Accessibility.AXNodeUpdated", handler);
  const cleanup = () => {
    cdp.off("Accessibility.AXNodeUpdated", handler);
    abortController.abort();
  };
  return [
    on(ev, "data", {
      signal: abortController.signal,
    }),
    cleanup,
  ];
}
