import arg from "arg";
import puppeteer from "puppeteer";
import { browserMain } from "./Browser/index.js";
import { setGlobalLogger } from "./Logger/global.js";
import { runSnapshot } from "./Snapshot/index.js";

const args = arg({
  "--snapshot": Boolean,
  "--debug": Boolean,
});

const url = args._[0] ?? "https://example.com/";

setGlobalLogger(args["--debug"] ?? false);

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
      await runSnapshot(page, process.stdout);
    } else {
      await browserMain(page, process.stdout);
    }
  } finally {
    await browser.close();
  }
}
