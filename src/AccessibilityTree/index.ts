import Protocol from "devtools-protocol";
import EventEmitter from "events";
import { Page } from "puppeteer";
import { debounce } from "throttle-debounce";
import { CDPObject } from "../Browser/CDPEvents/index.js";
import { globalLogger } from "../Logger/global.js";
import { checkAbort, ignoreAbort } from "../util/abort.js";
import { asyncIteratorToArray } from "../util/asyncIterator/asyncIteratorToArray.js";
import { filterMapAsync } from "../util/asyncIterator/filterMapAsync.js";
import { mergeAsync } from "../util/asyncIterator/mergeAsync.js";
import { joinIterables } from "../util/iterator/joinIterables.js";
import { AccessibilityNode } from "./AccessibilityNode.js";
import { convert } from "./convert.js";
import { recurse } from "./recurse.js";
import { update } from "./update.js";

type State =
  | {
      mode: "idle";
    }
  | {
      mode: "updating";
      abortController: AbortController;
    }
  | {
      // state between documentUpdated and domContentEventFired
      mode: "documentLoading";
    };

/**
 * Mutable tree of accessibility nodes.
 */
export class AccessibilityTree {
  #nodes: Map<string, AccessibilityNode> = new Map();
  #cdp: CDPObject;
  #cleanupEvents: (() => void) | undefined;
  #rootNode: AccessibilityNode | undefined;
  #state: State = {
    mode: "idle",
  };

  readonly treeEvent = new EventEmitter();

  constructor(page: Page, cdp: CDPObject) {
    this.#cdp = cdp;
  }

  #nodeUpdateHandler = ({
    nodes,
  }: Protocol.Protocol.Accessibility.NodesUpdatedEvent): void => {
    if (this.#state.mode !== "idle") {
      // Not listening to node updates
      globalLogger.debug("Node updates discarded", this.#state.mode, nodes);
      return;
    }
    const abortController = new AbortController();
    this.#state = {
      mode: "updating",
      abortController,
    };

    update(abortController.signal, this.#cdp, this.#nodes, nodes)
      .then(() => {
        this.#state = {
          mode: "idle",
        };
        if (abortController.signal.aborted) {
          return;
        }
        const rootWebArea = nodes.find(
          (node) => node.role?.value === "RootWebArea"
        );
        if (rootWebArea) {
          this.#rootNode = this.#nodes.get(rootWebArea.nodeId);
        }
        this.treeEvent.emit("update");
      }, ignoreAbort)
      .catch((err) => {
        if (abortController.signal.aborted) {
          return;
        }
        // Protocol error may happen when navigated during the update.
        // In this case, we attempt to initialize again.
        globalLogger.error(err);
        this.#state = {
          mode: "idle",
        };
        this.#debouncedReconstruct();
      });
  };

  #domContentEvnetHandler = () => {
    globalLogger.debug("domContentEvent");
    this.#debouncedReconstruct();
  };

  #debouncedReconstruct = debounce(
    500,
    () =>
      this.reconstruct().catch((err) => {
        this.treeEvent.emit("error", err);
      }),
    {
      atBegin: false,
    }
  );

  #documentUpdated(): void {
    globalLogger.debug("documentUpdated", this.#state);
    if (this.#state.mode === "updating") {
      this.#state.abortController.abort();
    }
    this.#state = {
      mode: "documentLoading",
    };
  }

  async *#listenToCDPEvents() {
    for await (const event of mergeAsync(
      this.#cdp.on("Accessibility.nodesUpdated"),
      this.#cdp.on("Page.domContentEventFired"),
      this.#cdp.on("DOM.documentUpdated")
    )) {
      switch (event.event) {
        case "Accessibility.nodesUpdated": {
          this.#nodeUpdateHandler(event.payload);
          break;
        }
        case "Page.domContentEventFired": {
          this.#domContentEvnetHandler();
          break;
        }
        case "DOM.documentUpdated": {
          this.#documentUpdated();
          break;
        }
      }
    }
  }

  /**
   * Constructs an accessibility tree by communicating with the browser.
   */
  public async initialize(): Promise<void> {
    this.#nodes.clear();
    await this.reconstruct();

    this.#cleanupEvents = (() => {
      const iter = this.#listenToCDPEvents();
      const cleanup = () => {
        iter.return?.();
      };
      (async () => {
        for await (const _ of iter) {
          // Do nothing
        }
      })().catch((err) => {
        this.treeEvent.emit("error", err);
      });
      return cleanup;
    })();
  }

  public async reconstruct(): Promise<void> {
    globalLogger.debug("reconstruct");
    if (this.#state.mode === "updating") {
      this.#state.abortController.abort();
    }
    const abortController = new AbortController();
    this.#state = {
      mode: "updating",
      abortController,
    };
    const signal = abortController.signal;
    try {
      const res = await this.#cdp.send("Accessibility.getRootAXNode");
      checkAbort(signal);

      const nodes = await asyncIteratorToArray(
        filterMapAsync(recurse(signal, this.#cdp, res.node), (x) => x)
      );

      // console.log(inspect(nodes, { depth: 10 }));
      this.#nodes = new Map();
      convert(joinIterables([res.node], nodes), this.#nodes);
      this.#rootNode = this.#nodes.get(res.node.nodeId);
      globalLogger.debug("rootNode", this.#rootNode);
      this.treeEvent.emit("update");
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      throw error;
    } finally {
      this.#state = {
        mode: "idle",
      };
    }
  }

  public async dispose(): Promise<void> {
    if (this.#state.mode === "updating") {
      this.#state.abortController.abort();
    }
    this.#cleanupEvents?.();
    this.#nodes.clear();
  }

  get rootNode(): AccessibilityNode | undefined {
    return this.#rootNode;
  }

  /**
   * Gets node by id.
   */
  public getById(id: string): AccessibilityNode | undefined {
    return this.#nodes.get(id);
  }
}
