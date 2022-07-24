import { Page } from "puppeteer";
import { Writable } from "stream";
import { AccessibilityTree } from "../AccessibilityTree/index.js";
import { getCDPEventsStream } from "../Browser/CDPEvents/index.js";
import { frameRenderer } from "../Browser/frameRenderer.js";
import { render } from "../Renderer/index.js";
import { defaultTheme, RenderContext } from "../Renderer/RenderContext.js";
import { constructUITree } from "../UITree/index.js";

export async function runSnapshot(
  page: Page,
  outputStream: Writable
): Promise<void> {
  const [cdp] = await getCDPEventsStream(page);
  const acc = new AccessibilityTree(page, cdp);
  await acc.initialize();
  const rootNode = acc.rootNode;
  if (!rootNode) {
    throw new Error("Root node not found");
  }
  const uit = constructUITree(rootNode);
  const context: RenderContext = {
    theme: defaultTheme,
    shouldPrintBlockSeparator: false,
    pre: false,
    getLineNumber: () => 0,
    onFocusedNode: () => {},
  };
  for (const line of frameRenderer(
    render(uit, context),
    Number.POSITIVE_INFINITY
  )) {
    outputStream.write(line + "\n");
  }
  return;
}
