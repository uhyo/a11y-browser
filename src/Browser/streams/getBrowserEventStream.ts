import Protocol from "devtools-protocol";
import { EventEmitter, on } from "events";
import { Page } from "puppeteer";
import { globalLogger } from "../../Logger/global.js";
import { mapAsync } from "../../util/asyncIterator/mapAsync.js";

export type BrowserEvent =
  | {
      type: "domcontentloaded";
    }
  | {
      type: "navigated";
      url: string;
    };

export async function getBrowserEventStream(
  page: Page
): Promise<[AsyncIterableIterator<BrowserEvent>, () => Promise<void>]> {
  const cdp = await page.target().createCDPSession();
  const abortController = new AbortController();
  const evName = "browserevent";
  const ev = new EventEmitter();
  const emit = (event: BrowserEvent) => ev.emit(evName, event);

  await cdp.send("Page.enable");

  cdp.on(
    "Page.lifecycleEvent",
    (ev: Protocol.Protocol.Page.LifecycleEventEvent) => {
      globalLogger.debug("lifecycleEvent", ev);
      if (ev.name === "navigation") {
        // Top-level frame
        emit({
          type: "navigated",
          url: page.url(),
        });
      }
    }
  );
  cdp.on(
    "Page.navigatedWithinDocument",
    (ev: Protocol.Protocol.Page.NavigatedWithinDocumentEvent) => {
      emit({
        type: "navigated",
        url: page.url(),
      });
    }
  );

  const domContentLoadedHandler = () => {
    emit({
      type: "domcontentloaded",
    });
  };
  page.on("domcontentloaded", domContentLoadedHandler);

  const cleanup = async () => {
    page.off("domcontentloaded", domContentLoadedHandler);
    abortController.abort();
    await cdp.detach();
  };

  return [
    mapAsync(
      on(ev, evName, {
        signal: abortController.signal,
      }),
      (ev) => ev[0]
    ),
    cleanup,
  ];
}
