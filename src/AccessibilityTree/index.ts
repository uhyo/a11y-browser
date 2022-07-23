import Protocol from "devtools-protocol";
import EventEmitter from "events";
import { CDPSession } from "puppeteer";
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

  readonly updatedEvent = new EventEmitter();

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
        this.updatedEvent.emit("update", this.#nodes);
      },
      (err) => {
        // Protocol error may happen when navigated during the update.
        globalLogger.error(err);
      }
    );
  };

  /**
   * Constructs an accessibility tree by communicating with the browser.
   */
  public async initialize(): Promise<void> {
    this.#nodes.clear();
    await this.#cdp.send("Accessibility.enable");
    const res = await this.#cdp.send("Accessibility.getRootAXNode");

    const nodes = await asyncIteratorToArray(
      filterMapAsync(recurse(this.#cdp, res.node), (x) => x)
    );

    // console.log(inspect(nodes, { depth: 10 }));
    convert(joinIterables([res.node], nodes), this.#nodes);
    this.#rootNode = this.#nodes.get(res.node.nodeId);

    this.#cdp.on("Accessibility.nodesUpdated", this.#nodeUpdateHandler);
    // process.exit(0);
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
