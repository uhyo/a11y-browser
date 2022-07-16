import { Page } from "puppeteer";
import { AccessibilityTree } from "../AccessibilityTree/index.js";
import { render } from "../Renderer/index.js";
import { constructUITree } from "../UITree/index.js";
import { mapAsync } from "../util/asyncIterator/mapAsync.js";
import { mergeAsync } from "../util/asyncIterator/mergeAsync.js";
import { splitByLines } from "../util/textIterator/splitByLines.js";
import { createDefaultBrowserState } from "./BrowserState.js";
import { registerCursorPositionQuery } from "./cursorPositionQuery.js";
import { handleKeyInput } from "./handleKeyInput.js";
import { getKeyInputStream } from "./keyInputStream.js";
import { getResizeEventStream } from "./resizeEventStream.js";
import {
  enterAlternateScreen,
  exitAlternateScreen,
  makeCursorInvisible,
  makeCursorVisible,
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

  let [, rows] = tty.getWindowSize();

  // Enter alternate screen
  enterAlternateScreen(tty);
  // Set scroll region
  setScrollRegion(tty, 0, rows + 2);
  setCursorPosition(tty, 0, 0);
  makeCursorInvisible(tty);
  process.on("exit", () => {
    makeCursorVisible(tty);
    exitAlternateScreen(tty);
  });

  const state = createDefaultBrowserState();
  const terminal = new Terminal(tty, process.stdin);
  terminal.start();
  const [rawKeyInput, cleanup] = getKeyInputStream(terminal);
  const [rawResize, cleanup2] = getResizeEventStream(tty);
  const keyInput = mapAsync(
    rawKeyInput,
    (input) =>
      ({
        type: "input",
        input,
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
    await renderFrame();
    for await (const event of mergeAsync(keyInput, resize)) {
      if (event.type === "input") {
        if (event.input.type === "raw") {
          if (event.input.value === 0 || event.input.value === 3) {
            // 3 means Ctrl-C
            break;
          }
        } else if (handleKeyInput(state, event.input)) {
          // update the screen
          await renderFrame();
        }
      } else if (event.type === "resize") {
        [, rows] = tty.getWindowSize();
        await renderFrame();
      }
    }
  } finally {
    cleanup();
    cleanup2();
    terminal.destroy();
  }

  async function renderFrame() {
    const { query, cleanup } = registerCursorPositionQuery(terminal);

    let skipLines;
    if (state.scrollY < 0) {
      // Emulate negative scrolling
      setCursorPosition(tty, -state.scrollY, 0);
      // clear screen up to the top of the screen
      tty.write("\x1b[1J");
      skipLines = 0;
    } else {
      setCursorPosition(tty, 0, 0);
      skipLines = state.scrollY;
    }
    for (const line of splitByLines(render(uit))) {
      if (skipLines > 0) {
        skipLines--;
        continue;
      }
      // Clear before and after the line
      tty.write("\x1b[K" + line + "\x1b[K\n");
      const { row: currentRow } = await query();
      if (currentRow >= rows) {
        break;
      }
    }

    setCursorPosition(tty, rows - 1, 0);
    tty.write("\x1b[KLAST LINE");

    cleanup();
  }
}
