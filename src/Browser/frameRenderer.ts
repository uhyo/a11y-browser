import stringWidth from "string-width";
import { default as wrapAnsi } from "wrap-ansi";
import {
  indentMarkerEnd,
  indentMarkerStart,
} from "../Renderer/indentMarker.js";
import { mapIterator } from "../util/iterator/mapIterator.js";
import { StackWithResult } from "../util/StackWithResult.js";
import { SummedStack } from "../util/SummedStack.js";
import { splitByLines } from "../util/textIterator/splitByLines.js";

/**
 * Wraps given flow of text so that it fits into terminal window,
 * and yields each line as separate event.
 */
export function* frameRenderer(
  textSource: Iterable<string>,
  width: number
): Generator<string, void, undefined> {
  const indentSizeStack = new SummedStack();
  const indentStrings = new StackWithResult<string, string>((indents) =>
    indents.join("")
  );
  for (const line of splitByLines(textSource)) {
    if (line.charAt(0) === indentMarkerStart) {
      // start of indent
      const indentContent = line.slice(1);
      const indentLength = stringWidth(indentContent);
      indentSizeStack.push(indentLength);
      indentStrings.push(indentContent);
      continue;
    }
    if (line.charAt(0) === indentMarkerEnd) {
      // end of indent
      indentSizeStack.pop();
      indentStrings.pop();
      continue;
    }
    yield* mapIterator(
      wrapAnsi(line, width - indentSizeStack.sum - 1, {
        hard: true,
        wordWrap: false,
      }).split("\n"),
      (line) => " " + indentStrings.result + line
    );
  }
}
