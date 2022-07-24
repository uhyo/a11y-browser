import EventEmitter, { on } from "events";
import { Page, ProtocolMapping } from "puppeteer";
import { globalLogger } from "../../Logger/global.js";
import { filterMapAsync } from "../../util/asyncIterator/filterMapAsync.js";

export type CDPEvent = keyof ProtocolMapping.Events extends infer Ev
  ? Ev extends keyof ProtocolMapping.Events
    ? {
        event: Ev;
        payload: ProtocolMapping.Events[Ev][0];
      }
    : never
  : never;

type CDPOn = <T extends keyof ProtocolMapping.Events>(
  event: T
) => AsyncIterableIterator<Extract<CDPEvent, { event: T }>>;

type CDPSend = <T extends keyof ProtocolMapping.Commands>(
  command: T,
  ...args: ProtocolMapping.Commands[T]["paramsType"]
) => Promise<ProtocolMapping.Commands[T]["returnType"]>;

export type CDPObject = {
  on: CDPOn;
  send: CDPSend;
};

const listenedEvents: (keyof ProtocolMapping.Events)[] = [
  "Accessibility.nodesUpdated",
  "Page.navigatedWithinDocument",
  "Page.domContentEventFired",
  "DOM.documentUpdated",
];

/**
 * Listens to raw CDP events.
 */
export async function getCDPEventsStream(
  page: Page
): Promise<[cdp: CDPObject, cleanup: () => Promise<void>]> {
  const cdp = await page.target().createCDPSession();
  await cdp.send("Page.enable");
  await cdp.send("Accessibility.enable");
  await cdp.send("DOM.enable");

  const abortController = new AbortController();
  const evName = "cdpevent";
  const ev = new EventEmitter();
  const emit = (event: CDPEvent) => ev.emit(evName, event);
  const cleanup = async () => {
    abortController.abort();
    await cdp.detach();
  };

  for (const ev of listenedEvents) {
    cdp.on(ev, (payload) => {
      emit({ event: ev, payload } as CDPEvent);
    });
  }

  const cdpOn: CDPOn = (type) => {
    return filterMapAsync(on(ev, evName), ([event]) => {
      if (event.event === type) {
        globalLogger.debug(`CDPEvent: ${type}`);
        return event;
      }
      return undefined;
    });
  };

  const send: CDPSend = (command, ...args) => {
    return cdp.send(command, ...args);
  };

  const cdpObject = {
    on: cdpOn,
    send,
  };

  return [cdpObject, cleanup];
}
