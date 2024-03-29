import Protocol from "devtools-protocol";
import EventEmitter from "events";
import { Page } from "puppeteer";
import { debounce } from "throttle-debounce";
import { CDPObject } from "../Browser/CDPEvents/index.js";
import { globalLogger } from "../Logger/global.js";
import { checkAbort } from "../util/abort.js";
import { asyncIteratorToArray } from "../util/asyncIterator/asyncIteratorToArray.js";
import { filterMapAsync } from "../util/asyncIterator/filterMapAsync.js";
import { mergeAsync } from "../util/asyncIterator/mergeAsync.js";
import { joinIterables } from "../util/iterator/joinIterables.js";
import { TaskQueue } from "../util/TaskQueue/index.js";
import { AccessibilityNode, AXNode } from "./AccessibilityNode.js";
import { convert } from "./convert.js";
import { recurse } from "./recurse.js";
import { update } from "./update.js";

type Task =
  | {
      type: "update";
      nodes: AXNode[];
    }
  | {
      type: "reconstruct";
      newRoot?: AXNode;
    };

/**
 * Mutable tree of accessibility nodes.
 */
export class AccessibilityTree {
  #nodes: Map<string, AccessibilityNode> = new Map();
  #cdp: CDPObject;
  #cleanupEvents: (() => void) | undefined;
  #rootNode: AccessibilityNode | undefined;
  #taskQueue = new TaskQueue<Task>();
  #runningTask = new Set<{
    task: Task;
    controller: AbortController;
  }>();

  readonly treeEvent = new EventEmitter();

  constructor(page: Page, cdp: CDPObject) {
    this.#cdp = cdp;
    this.#taskQueue.event.on("readable", this.#handleTask.bind(this));
  }

  #handleTask = () => {
    this.#taskQueue.take(async ({ controller, task }) => {
      const { signal } = controller;
      if (signal.aborted) {
        return;
      }
      const runningTask = { task, controller };
      this.#runningTask.add(runningTask);
      try {
        switch (task.type) {
          case "update": {
            try {
              await update(signal, this.#cdp, this.#nodes, task.nodes);
              if (signal.aborted) {
                return;
              }
              const rootWebArea = task.nodes.find(
                (node) => node.role?.value === "RootWebArea",
              );
              if (rootWebArea) {
                this.#rootNode = this.#nodes.get(rootWebArea.nodeId);
              }
              this.treeEvent.emit("update");
            } catch (err) {
              if (signal.aborted) {
                return;
              }
              // Protocol error may happen when navigated during the update.
              // In this case, we attempt to initialize again.
              globalLogger.error(err);
              this.#debouncedReconstruct();
            }
            break;
          }
          case "reconstruct": {
            try {
              await this.reconstruct(task.newRoot);
            } catch (err) {
              if (signal.aborted) {
                return;
              }
              globalLogger.error(err);
            }
            break;
          }
        }
      } finally {
        this.#runningTask.delete(runningTask);
      }
    });
  };

  #nodeUpdateHandler = ({
    nodes,
  }: Protocol.Protocol.Accessibility.NodesUpdatedEvent): void => {
    this.#taskQueue.push({
      type: "update",
      nodes,
    });
  };

  #loadCompleteEventHandler = (newRoot: AXNode) => {
    globalLogger.debug("domContentEvent");
    this.#taskQueue.push({
      type: "reconstruct",
      newRoot,
    });
  };

  #debouncedReconstruct = debounce(
    500,
    () => {
      this.#taskQueue.push({
        type: "reconstruct",
      });
    },
    {
      atBegin: false,
    },
  );

  #documentUpdated(): void {
    globalLogger.debug("documentUpdated");
    // When DOM.documentUpdated is fired, existing accessibility nodes may be invalidated.
    // Therefore, we abort all running tasks and wait for DOMContentLoaded.
    this.#abortRunningTasks();
  }

  #abortRunningTasks(): void {
    for (const { controller } of this.#runningTask) {
      controller.abort();
    }
  }

  async *#listenToCDPEvents() {
    for await (const event of mergeAsync(
      this.#cdp.on("Accessibility.loadComplete"),
      this.#cdp.on("Accessibility.nodesUpdated"),
      this.#cdp.on("DOM.documentUpdated"),
    )) {
      switch (event.event) {
        case "Accessibility.nodesUpdated": {
          this.#nodeUpdateHandler(event.payload);
          break;
        }
        case "Accessibility.loadComplete": {
          this.#loadCompleteEventHandler(event.payload.root);
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
    await this.reconstruct(undefined);

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

  public async reconstruct(
    newRoot: AXNode | undefined,
    abortController: AbortController = new AbortController(),
  ): Promise<void> {
    globalLogger.debug("reconstruct");
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    globalLogger.debug("reconstruct start");
    const signal = abortController.signal;
    try {
      if (newRoot === undefined) {
        const res = await this.#cdp.send("Accessibility.getRootAXNode");
        checkAbort(signal);
        newRoot = res.node;
      }

      const nodes = await asyncIteratorToArray(
        filterMapAsync(recurse(signal, this.#cdp, newRoot), (x) => x),
      );
      checkAbort(signal);

      // console.log(inspect(nodes, { depth: 10 }));
      this.#nodes = new Map();
      convert(joinIterables([newRoot], nodes), this.#nodes);
      this.#rootNode = this.#nodes.get(newRoot.nodeId);
      globalLogger.debug("rootNode", this.#rootNode);
      this.treeEvent.emit("update");
      globalLogger.debug("reconstruct done");
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      throw error;
    }
  }

  public async dispose(): Promise<void> {
    this.#abortRunningTasks();
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
