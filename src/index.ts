import puppeteer from "puppeteer";
import { AccessibilityTree } from "./AccessibilityTree/index.js";
import { render } from "./Renderer/index.js";
import { constructUITree } from "./UITree/index.js";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
  });
  try {
    const url = process.argv[2] ?? "https://example.com/";
    const page = await browser.newPage();
    const cdp = await page.target().createCDPSession();
    await cdp.send("Accessibility.enable");
    await page.goto(url);
    const tree = await cdp.send("Accessibility.getFullAXTree");
    const acc = new AccessibilityTree();
    acc.initialize(tree.nodes);
    const rootNode = acc.getById(tree.nodes[0]?.nodeId || "0");
    if (!rootNode) {
      throw new Error("Root node not found");
    }
    const uit = constructUITree(rootNode);
    // console.log(inspect(uit, { depth: 10 }));
    console.log(render(uit[0]!));
  } finally {
    await browser.close();
  }
}
