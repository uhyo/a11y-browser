import { CDPSession } from "puppeteer";
import { asyncIteratorToArray } from "../util/asyncIterator/asyncIteratorToArray.js";
import { filterMapAsync } from "../util/asyncIterator/filterMapAsync.js";
import { joinIterables } from "../util/iterator/joinIterables.js";
import { AccessibilityNode } from "./AccessibilityNode.js";
import { convert } from "./convert.js";
import { recurse } from "./recurse.js";

/**
 * Mutable tree of accessibility nodes.
 */
export class AccessibilityTree {
  #nodes: Map<string, AccessibilityNode> = new Map();
  #cdp: CDPSession;
  #rootNode: AccessibilityNode | undefined;

  constructor(cdp: CDPSession) {
    this.#cdp = cdp;
  }

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

    // process.exit(0);
  }

  public async dispose(): Promise<void> {
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
