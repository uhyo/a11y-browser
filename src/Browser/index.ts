import { Page } from "puppeteer";
import { AccessibilityTree } from "../AccessibilityTree/index.js";
import { render } from "../Renderer/index.js";
import { constructUITree } from "../UITree/index.js";
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
  const [keyInput, cleanup] = getKeyInputStream();
  try {
    renderFrame();
    for await (const key of keyInput) {
      if (key === 0 || key === 3) {
        // 3 means Ctrl-C
        break;
      }
      renderFrame();
    }
  } finally {
    cleanup();
  }

  function renderFrame() {
    console.clear();
    process.stdout.write(render(uit));
  }
}
