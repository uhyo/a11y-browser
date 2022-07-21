import arg from "arg";
import puppeteer from "puppeteer";
import { inspect } from "util";
import { AccessibilityTree } from "./AccessibilityTree/index.js";
import { browserMain } from "./Browser/index.js";
import { render } from "./Renderer/index.js";
import { defaultTheme, RenderContext } from "./Renderer/RenderContext.js";
import { constructUITree } from "./UITree/index.js";

const args = arg({
  "--snapshot": Boolean,
});

const url = args._[0] ?? "https://example.com/";

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    if (args["--snapshot"] || !process.stdout.isTTY) {
      const cdp = await page.target().createCDPSession();
      await cdp.send("Accessibility.enable");
      const tree = await cdp.send("Accessibility.getFullAXTree");
      const acc = new AccessibilityTree(cdp);
      await acc.initialize();
      const rootNode = acc.rootNode;
      if (!rootNode) {
        throw new Error("Root node not found");
      }
      const uit = constructUITree(rootNode);
      console.log(inspect(uit, { depth: 15 }));
      const context: RenderContext = {
        theme: defaultTheme,
        shouldPrintBlockSeparator: false,
        getLineNumber: () => 0,
        onFocusedNode: () => {},
      };
      for (const line of render(uit, context)) {
        process.stdout.write(line);
      }
      return;
    } else {
      await browserMain(page, process.stdout);
    }
  } finally {
    await browser.close();
  }
}
