import { default as wrapAnsi } from "wrap-ansi";
import { splitByLines } from "../util/textIterator/splitByLines.js";
/**
 * Wraps given flow of text so that it fits into terminal window,
 * and yields each line as separate event.
 */
export function* textWrap(
  textSource: Iterable<string>,
  width: number
): Generator<string, void, undefined> {
  for (const line of splitByLines(textSource)) {
    yield* wrapAnsi(line, width, {
      hard: true,
      wordWrap: false,
    }).split("\n");
  }
}
