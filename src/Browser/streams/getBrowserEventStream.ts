import { EventEmitter, on } from "events";
import { Page } from "puppeteer";

export function getBrowserEventStream(
  page: Page
): [AsyncIterableIterator<void>, () => void] {
  const abortController = new AbortController();
  const ev = new EventEmitter();
  const handler = () => {
    ev.emit("domcontentloaded");
  };
  page.on("domcontentloaded", handler);
  const cleanup = () => {
    page.off("domcontentloaded", handler);
    abortController.abort();
  };

  return [
    on(ev, "domcontentloaded", {
      signal: abortController.signal,
    }),
    cleanup,
  ];
}
