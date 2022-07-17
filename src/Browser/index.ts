import { performance } from "perf_hooks";
import { Page } from "puppeteer";
import { inspect } from "util";
import { AccessibilityTree } from "../AccessibilityTree/index.js";
import { render } from "../Renderer/index.js";
import { constructUITree } from "../UITree/index.js";
import { mapAsync } from "../util/asyncIterator/mapAsync.js";
import { mergeAsync } from "../util/asyncIterator/mergeAsync.js";
import { splitByLines } from "../util/textIterator/splitByLines.js";
import { createDefaultBrowserState } from "./BrowserState.js";
import { mapInputToCommand } from "./commands.js";
import { registerCursorPositionQuery } from "./cursorPositionQuery.js";
import { getAXNodeUpdateStream } from "./streams/AXNodeUpdateStream.js";
import { getKeyInputStream } from "./streams/keyInputStream.js";
import { getResizeEventStream } from "./streams/resizeEventStream.js";
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
  const acc = new AccessibilityTree(cdp);
  const startTime = performance.now();
  await acc.initialize();
  const endTime = performance.now();
  console.error("initialize", endTime - startTime, "ms");
  const rootNode = acc.rootNode;
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
  const [rawAXNodeUpdate, cleanup3] = getAXNodeUpdateStream(cdp);
  const eventsStream = mergeAsync(
    mapAsync(
      mapInputToCommand(rawKeyInput),
      (command) =>
        ({
          type: "command",
          command,
        } as const)
    ),
    mapAsync(
      rawResize,
      () =>
        ({
          type: "resize",
        } as const)
    ),
    mapAsync(
      rawAXNodeUpdate,
      (nodes) =>
        ({
          type: "AXNodeUpdate",
          nodes,
        } as const)
    )
  );
  try {
    await renderFrame();
    mainLoop: for await (const event of eventsStream) {
      switch (event.type) {
        case "command": {
          const { command } = event;
          switch (command) {
            case "quit": {
              break mainLoop;
            }
            case "scrollDown": {
              state.scrollY++;
              await renderFrame();
              break;
            }
            case "scrollUp": {
              state.scrollY--;
              await renderFrame();
              break;
            }
            case "tabBackward": {
              page.keyboard.down("Shift");
              page.keyboard.press("Tab");
              page.keyboard.up("Shift");
              break;
            }
            case "tabForward": {
              page.keyboard.press("Tab");
              break;
            }
          }
          break;
        }
        case "resize": {
          [, rows] = tty.getWindowSize();
          await renderFrame();
          break;
        }
        case "AXNodeUpdate": {
          console.error("AXNodeUpdate", inspect(event.nodes, { depth: 10 }));
          break;
        }
      }
    }
  } finally {
    cleanup();
    cleanup2();
    cleanup3();
    terminal.destroy();
    await acc.dispose();
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
