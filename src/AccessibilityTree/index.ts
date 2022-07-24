import Protocol from "devtools-protocol";
import EventEmitter from "events";
import { CDPSession } from "puppeteer";
import { debounce } from "throttle-debounce";
import { globalLogger } from "../Logger/global.js";
import { asyncIteratorToArray } from "../util/asyncIterator/asyncIteratorToArray.js";
import { filterMapAsync } from "../util/asyncIterator/filterMapAsync.js";
import { joinIterables } from "../util/iterator/joinIterables.js";
import { AccessibilityNode } from "./AccessibilityNode.js";
import { convert } from "./convert.js";
import { recurse } from "./recurse.js";
import { update } from "./update.js";

/**
 * Mutable tree of accessibility nodes.
 */
export class AccessibilityTree {
  #nodes: Map<string, AccessibilityNode> = new Map();
  #cdp: CDPSession;
  #rootNode: AccessibilityNode | undefined;

  readonly treeEvent = new EventEmitter();

  constructor(cdp: CDPSession) {
    this.#cdp = cdp;
  }

  #nodeUpdateHandler = ({
    nodes,
  }: Protocol.Protocol.Accessibility.NodesUpdatedEvent): void => {
    update(this.#cdp, this.#nodes, nodes).then(
      () => {
        const rootWebArea = nodes.find(
          (node) => node.role?.value === "RootWebArea"
        );
        if (rootWebArea) {
          this.#rootNode = this.#nodes.get(rootWebArea.nodeId);
        }
        this.treeEvent.emit("update");
      },
      (err) => {
        // Protocol error may happen when navigated during the update.
        // In this case, we attempt to initialize again.
        globalLogger.error(err);
        this.#debouncedReconstruct();
      }
    );
  };

  #debouncedReconstruct = debounce(500, this.reconstruct, {
    atBegin: false,
  });

  /**
   * Constructs an accessibility tree by communicating with the browser.
   */
  public async initialize(): Promise<void> {
    this.#nodes.clear();
    await this.#cdp.send("Accessibility.enable");

    await this.reconstruct();

    this.#cdp.on("Accessibility.nodesUpdated", this.#nodeUpdateHandler);
  }

  public async reconstruct(): Promise<void> {
    globalLogger.debug("reconstruct");
    const res = await this.#cdp.send("Accessibility.getRootAXNode");

    const nodes = await asyncIteratorToArray(
      filterMapAsync(recurse(this.#cdp, res.node), (x) => x)
    );

    // console.log(inspect(nodes, { depth: 10 }));
    this.#nodes = new Map();
    convert(joinIterables([res.node], nodes), this.#nodes);
    this.#rootNode = this.#nodes.get(res.node.nodeId);
    this.treeEvent.emit("update");
  }

  public async dispose(): Promise<void> {
    this.#cdp.off("Accessibility.nodesUpdated", this.#nodeUpdateHandler);
    await this.#cdp.send("Accessibility.disable");
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
