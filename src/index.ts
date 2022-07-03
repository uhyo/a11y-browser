import puppeteer from "puppeteer";
import { inspect } from "util";
import { AccessibilityTree } from "./AccessibilityTree/index.js";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const cdp = await page.target().createCDPSession();
    await cdp.send("Accessibility.enable");
    await page.goto("https://example.com/");
    const tree = await cdp.send("Accessibility.getFullAXTree");
    const acc = new AccessibilityTree();
    acc.initialize(tree.nodes);
    console.log(
      inspect(acc.getById(tree.nodes[0]?.nodeId || "0"), { depth: 10 })
    );
  } finally {
    await browser.close();
  }
}
