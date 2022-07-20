import { performance } from "perf_hooks";
import { Page } from "puppeteer";
import { AccessibilityTree } from "../AccessibilityTree/index.js";
import { render } from "../Renderer/index.js";
import { constructUITree } from "../UITree/index.js";
import { UINode } from "../UITree/UINode.js";
import { mapAsync } from "../util/asyncIterator/mapAsync.js";
import { mergeAsync } from "../util/asyncIterator/mergeAsync.js";
import { createDefaultBrowserState } from "./BrowserState.js";
import { mapInputToCommand } from "./commands.js";
import { frameRenderer } from "./frameRenderer.js";
import { getAXNodeUpdateStream } from "./streams/AXNodeUpdateStream.js";
import { getBrowserEventStream } from "./streams/getBrowserEventStream.js";
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
  let uit = getUINode(acc);

  let [columns, rows] = tty.getWindowSize();

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
  state.columns = columns;
  state.rows = rows;
  const terminal = new Terminal(tty, process.stdin);
  terminal.start();
  const [rawKeyInput, cleanup] = getKeyInputStream(terminal);
  const [rawResize, cleanup2] = getResizeEventStream(tty);
  const [rawAXNodeUpdate, cleanup3] = getAXNodeUpdateStream(acc);
  const [rowBrowserEvent, cleanup4] = getBrowserEventStream(page);
  const eventsStream = mergeAsync(
    mapAsync(
      mapInputToCommand(state, rawKeyInput),
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
      () =>
        ({
          type: "uiupdate",
        } as const)
    ),
    mapAsync(
      rowBrowserEvent,
      () =>
        ({
          type: "domcontentloaded",
        } as const)
    )
  );
  try {
    await renderFrame();
    mainLoop: for await (const event of eventsStream) {
      switch (event.type) {
        case "command": {
          const { command } = event;
          switch (command.type) {
            case "quit": {
              break mainLoop;
            }
            case "scroll": {
              state.scrollY += command.amount;
              await renderFrame();
              break;
            }
            case "key": {
              const { key, modifiers = [] } = command;
              for (const m of modifiers) {
                page.keyboard.down(m);
              }
              page.keyboard.press(key);
              for (const m of [...modifiers].reverse()) {
                page.keyboard.up(m);
              }
              break;
            }
          }
          break;
        }
        case "resize": {
          [columns, rows] = tty.getWindowSize();
          state.columns = columns;
          state.rows = rows;
          await renderFrame();
          break;
        }
        case "uiupdate": {
          // console.error("update!");
          // console.error(inspect(acc.rootNode, { depth: 20 }));
          uit = getUINode(acc);
          await renderFrame();
          // console.error(inspect(uit, { depth: 20 }));
          break;
        }
        case "domcontentloaded": {
          // Scroll to the top
          state.scrollY = 0;
          await renderFrame();
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
    let skipLines = state.scrollY < 0 ? 0 : state.scrollY;
    let screenBuffer = state.scrollY < 0 ? "\n".repeat(-state.scrollY) : "";
    let screenBufferLines = Math.max(0, -state.scrollY);
    for (const line of frameRenderer(render(uit), state.columns)) {
      if (skipLines > 0) {
        skipLines--;
        continue;
      }
      screenBuffer += line + "\n";
      screenBufferLines++;
      if (screenBufferLines >= state.rows - 1) {
        break;
      }
    }
    setCursorPosition(tty, 0, 0);
    // clear to the bottom of the screen
    tty.write("\x1b[0J");
    tty.write(screenBuffer);

    setCursorPosition(tty, rows - 1, 0);
    // tty.write("\x1b[KLAST LINE");
    tty.write("\x1b[");
  }
}

function getUINode(acc: AccessibilityTree): UINode {
  const rootNode = acc.rootNode;
  if (!rootNode) {
    throw new Error("Root node not found");
  }
  return constructUITree(rootNode);
}
