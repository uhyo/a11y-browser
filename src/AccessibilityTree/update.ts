import { CDPSession } from "puppeteer";
import { inspect } from "util";
import { globalLogger } from "../Logger/global.js";
import { asyncIteratorToArray } from "../util/asyncIterator/asyncIteratorToArray.js";
import { filterMapAsync } from "../util/asyncIterator/filterMapAsync.js";
import { joinAsyncIterables } from "../util/asyncIterator/joinAsyncIterables.js";
import { joinIterables } from "../util/iterator/joinIterables.js";
import { AccessibilityNode, AXNode } from "./AccessibilityNode.js";
import { convertOneNode } from "./convert.js";
import { recurse } from "./recurse.js";

/**
 * Apply update to the accessibility tree.
 */
export async function update(
  cdp: CDPSession,
  nodeMap: Map<string, AccessibilityNode>,
  updates: readonly AXNode[]
): Promise<void> {
  globalLogger.error("AXNodes", inspect(updates, { depth: 10 }));
  const affectedParentIds = new Set<string>();
  const parentsWithLackedChildren: AXNode[] = [];
  for (const node of updates) {
    const existing = nodeMap.get(node.nodeId);
    const acc = convertOneNode(node);
    nodeMap.set(acc.id, acc);
    if (acc.parentId !== undefined) {
      affectedParentIds.add(acc.parentId);
    }
    let removedChildrenIds: Set<string> | undefined;
    if (!node.childIds) {
      continue;
    }
    if (existing !== undefined) {
      // replaces existing node
      removedChildrenIds = new Set(existing.children.map((x) => x.id));
    }
    for (const childId of node.childIds) {
      removedChildrenIds?.delete(childId);
      if (!nodeMap.has(childId)) {
        parentsWithLackedChildren.push(node);
        break;
      }
    }
    if (removedChildrenIds) {
      for (const id of removedChildrenIds) {
        nodeMap.delete(id);
      }
    }
  }
  const gens = await Promise.all(
    parentsWithLackedChildren.map(async (node) => {
      const gen = recurse(cdp, node);
      await gen.next();
      return gen;
    })
  );
  const newNodes = await asyncIteratorToArray(
    filterMapAsync(joinAsyncIterables(...gens), (x) => x)
  );
  for (const node of newNodes) {
    const acc = convertOneNode(node);
    nodeMap.set(acc.id, acc);
  }

  for (const node of joinIterables(updates, newNodes)) {
    const acc = nodeMap.get(node.nodeId);
    if (acc === undefined) {
      // new node
      continue;
    }
    if (node.childIds) {
      acc.children = node.childIds.map((id) => {
        const child = nodeMap.get(id);
        if (child === undefined) {
          throw new Error(`Child not found: ${id}`);
        }
        return child;
      });
    }
  }
  for (const id of affectedParentIds) {
    const parent = nodeMap.get(id);
    if (parent === undefined) {
      continue;
    }
    parent.children = parent.children.map((x) => {
      const child = nodeMap.get(x.id);
      if (child === undefined) {
        throw new Error(`Child not found: ${x.id}`);
      }
      return child;
    });
  }
}
