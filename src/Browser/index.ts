import { performance } from "perf_hooks";
import { Page } from "puppeteer";
import { AccessibilityTree } from "../AccessibilityTree/index.js";
import { render } from "../Renderer/index.js";
import { defaultTheme, RenderContext } from "../Renderer/RenderContext.js";
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

  const renderingTheme = defaultTheme;
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
  let lastRenderingResult: RenderResult | undefined;
  try {
    renderScreen(true);
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
              renderScreen(false);
              break;
            }
            case "scrollToTop": {
              state.scrollY = 0;
              renderScreen(false);
              break;
            }
            case "scrollToBottom": {
              if (uit.renderedPosition === undefined) {
                break;
              }
              state.scrollY = Math.max(0, uit.renderedPosition.end - rows + 2);
              renderScreen(false);
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
          renderScreen(true);
          break;
        }
        case "uiupdate": {
          // console.error("update!");
          // console.error(inspect(acc.rootNode, { depth: 20 }));
          uit = getUINode(acc);
          // renderScreen(true);
          rerenderOnBackground();
          // todo: detect if focused node truly changed
          if (lastRenderingResult?.focusedNode?.renderedPosition) {
            scrollTo(
              lastRenderingResult.focusedNode.renderedPosition.start,
              lastRenderingResult.focusedNode.renderedPosition.end
            );
          }
          renderScreen(false);
          // console.error(inspect(uit, { depth: 20 }));
          break;
        }
        case "domcontentloaded": {
          // Scroll to the top
          state.scrollY = 0;
          renderScreen(true);
          break;
        }
      }
    }
  } finally {
    cleanup();
    cleanup2();
    cleanup3();
    cleanup4();
    terminal.destroy();
    await acc.dispose();
  }

  function scrollTo(start: number, end: number) {
    const regionHeight = end - start + 1;
    const currentScrollStart = state.scrollY;
    const currentScrollEnd = state.scrollY + getBrowsingAreaHeight();

    if (end > currentScrollEnd) {
      state.scrollY = start + regionHeight - getBrowsingAreaHeight() + 1;
    }
    if (start < currentScrollStart) {
      state.scrollY = start;
    }
  }

  function rerenderOnBackground() {
    lastRenderingResult = renderFrame(false);
  }

  function renderScreen(forceRerender: boolean) {
    const eb = lastRenderingResult?.entirePageBuffer;
    const reuseBuffer = !forceRerender && eb !== undefined;

    if (reuseBuffer) {
      // synthesize screen from buffer
      const screen = eb.slice(state.scrollY, state.scrollY + rows - 1);
      renderBrowserInterface(
        screen.join("\n"),
        lastRenderingResult?.focusedNode
      );
      return;
    }
    lastRenderingResult = renderFrame(true);
  }

  type RenderResult = {
    /**
     * The entire page rendered as a string.
     * One line per element.
     */
    entirePageBuffer: string[];
    /**
     * Currently focused node.
     */
    focusedNode: UINode | undefined;
  };

  function renderFrame(withFlush: boolean): RenderResult {
    const entirePageBuffer = [];
    let screenBuffer = state.scrollY < 0 ? "\n".repeat(-state.scrollY) : "";

    const screenStartLine = Math.max(0, state.scrollY);
    const screenEndLine = state.scrollY + state.rows - 2;

    let focusedNode: UINode | undefined;

    let currentLine = 0;
    const context: RenderContext = {
      theme: renderingTheme,
      shouldPrintBlockSeparator: false,
      getLineNumber: () => currentLine,
      onFocusedNode: (node) => {
        focusedNode = node;
      },
    };

    let flushed = false;
    for (const line of frameRenderer(render(uit, context), state.columns)) {
      entirePageBuffer.push(line);
      if (withFlush) {
        if (currentLine >= screenStartLine && currentLine <= screenEndLine) {
          screenBuffer += line + "\n";
        }
        if (currentLine >= screenEndLine && !flushed) {
          flushed = true;
          // render the screen buffer.
          // Continue to render internally to calculate position of UINodes.
          renderBrowserInterface(screenBuffer, focusedNode);
        }
      }
      currentLine++;
    }
    if (withFlush && !flushed) {
      renderBrowserInterface(screenBuffer, focusedNode);
    }

    return {
      entirePageBuffer,
      focusedNode,
    };
  }
  function renderBrowserInterface(
    screenBuffer: string,
    focusedNode: UINode | undefined
  ) {
    setCursorPosition(tty, 0, 0);
    // clear to the bottom of the screen
    tty.write("\x1b[0J");
    tty.write(screenBuffer);

    // Render focused icon
    if (focusedNode?.renderedPosition) {
      const { start, end } = focusedNode.renderedPosition;
      const startLine = start - state.scrollY;
      const endLine = end - state.scrollY;
      for (let i = startLine; i <= endLine; i++) {
        setCursorPosition(tty, i, 0);
        tty.write(renderingTheme.focused(">"));
      }
    }

    setCursorPosition(tty, rows - 1, 0);
    // tty.write("\x1b[KLAST LINE");
    tty.write("\x1b[");
  }

  function getBrowsingAreaHeight() {
    return rows - 1;
  }
}

function getUINode(acc: AccessibilityTree): UINode {
  const rootNode = acc.rootNode;
  if (!rootNode) {
    throw new Error("Root node not found");
  }
  return constructUITree(rootNode);
}
