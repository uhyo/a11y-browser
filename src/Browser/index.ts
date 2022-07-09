import { Page } from "puppeteer";
import { AccessibilityTree } from "../AccessibilityTree/index.js";
import { render } from "../Renderer/index.js";
import { constructUITree } from "../UITree/index.js";
import { mapAsync } from "../util/asyncIterator/mapAsync.js";
import { createDefaultBrowserState } from "./BrowserState.js";
import { getKeyInputStream } from "./keyInputStream.js";

export async function browserMain(page: Page): Promise<void> {
  const cdp = await page.target().createCDPSession();
  await cdp.send("Accessibility.enable");
  const tree = await cdp.send("Accessibility.getFullAXTree");
  const acc = new AccessibilityTree();
  acc.initialize(tree.nodes);
  const rootNode = acc.getById(tree.nodes[0]?.nodeId || "0");
  if (!rootNode) {
    throw new Error("Root node not found");
  }
  const uit = constructUITree(rootNode);

  const state = createDefaultBrowserState();
  const [rawKeyInput, cleanup] = getKeyInputStream();
  const keyInput = mapAsync(
    rawKeyInput,
    (key) =>
      ({
        type: "key",
        key,
      } as const)
  );
  try {
    renderFrame();
    for await (const event of keyInput) {
      if (event.type === "key") {
        if (event.key === 0 || event.key === 3) {
          // 3 means Ctrl-C
          break;
        }
      }
      renderFrame();
    }
  } finally {
    cleanup();
  }

  function renderFrame() {
    console.clear();
    for (const line of render(uit)) {
      process.stdout.write(line);
    }
  }
}
