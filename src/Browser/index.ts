import { Page } from "puppeteer";
import terminfo from "terminfo";
import { AccessibilityTree } from "../AccessibilityTree/index.js";
import { render } from "../Renderer/index.js";
import { constructUITree } from "../UITree/index.js";
import { mapAsync } from "../util/asyncIterator/mapAsync.js";
import { mergeAsync } from "../util/asyncIterator/mergeAsync.js";
import { splitByLines } from "../util/textIterator/splitByLines.js";
import { createDefaultBrowserState } from "./BrowserState.js";
import { getKeyInputStream } from "./keyInputStream.js";
import { getResizeEventStream } from "./resizeEventStream.js";
import {
  enterAlternateScreen,
  exitAlternateScreen,
  setCursorPosition,
  setScrollRegion,
} from "./terminal.js";
import { Terminal } from "./Terminal/index.js";

export async function browserMain(
  page: Page,
  tty: NodeJS.WriteStream
): Promise<void> {
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

  const trm = terminfo();

  let [columns, rows] = tty.getWindowSize();

  // Enter alternate screen
  enterAlternateScreen(tty);
  // Set scroll region
  setScrollRegion(tty, 0, 0);
  setCursorPosition(tty, 0, 0);
  process.on("exit", () => {
    exitAlternateScreen(tty);
  });

  const state = createDefaultBrowserState();
  const terminal = new Terminal(tty, process.stdin);
  terminal.start();
  const [rawKeyInput, cleanup] = getKeyInputStream(terminal);
  const [rawResize, cleanup2] = getResizeEventStream(tty);
  const keyInput = mapAsync(
    rawKeyInput,
    (key) =>
      ({
        type: "key",
        key,
      } as const)
  );
  const resize = mapAsync(
    rawResize,
    () =>
      ({
        type: "resize",
      } as const)
  );
  try {
    renderFrame();
    for await (const event of mergeAsync(keyInput, resize)) {
      if (event.type === "key") {
        if (event.key === 0 || event.key === 3) {
          // 3 means Ctrl-C
          break;
        }
      } else if (event.type === "resize") {
        [columns, rows] = tty.getWindowSize();
      }
      renderFrame();
    }
  } finally {
    cleanup();
    cleanup2();
    terminal.destroy();
  }

  function renderFrame() {
    tty.write(trm.clearScreen ?? "");

    let lines = 0;
    for (const line of splitByLines(render(uit))) {
      tty.write(line);
      lines++;
      if (lines >= rows - 1) {
        break;
      }
    }
  }
}
