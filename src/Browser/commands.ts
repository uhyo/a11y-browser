import { KeyInput } from "puppeteer";
import { filterMapAsync } from "../util/asyncIterator/filterMapAsync.js";
import { BrowserState } from "./BrowserState.js";
import { InputChunk } from "./Terminal/inputChunkParser.js";

type Command =
  | { type: "quit" }
  | { type: "scroll"; amount: number }
  | { type: "key"; key: KeyInput; modifiers?: KeyInput[] };

export function mapInputToCommand(
  state: BrowserState,
  input: AsyncIterable<InputChunk>
): AsyncIterable<Command> {
  return filterMapAsync(input, (chunk) => {
    switch (chunk.type) {
      case "raw": {
        switch (chunk.value) {
          case 0:
          case 3:
            return { type: "quit" };
          case 9: // tab
            return {
              type: "key",
              key: "Tab",
            };
          case 13: // enter
            return {
              type: "key",
              key: "Enter",
            };
          case 32: // space
            return {
              type: "key",
              key: " ",
            };
        }
        break;
      }
      case "escape-sequence": {
        if (escapeSequenceEquals(chunk.sequence, keyUpSequence)) {
          return { type: "scroll", amount: -1 };
        }
        if (escapeSequenceEquals(chunk.sequence, keyDownSequence)) {
          return { type: "scroll", amount: 1 };
        }
        if (escapeSequenceEquals(chunk.sequence, shiftTabSequence)) {
          return {
            type: "key",
            key: "Tab",
            modifiers: ["Shift"],
          };
        }
        if (escapeSequenceEquals(chunk.sequence, pageDownSequence)) {
          return { type: "scroll", amount: state.rows };
        }
        if (escapeSequenceEquals(chunk.sequence, pageUpSequence)) {
          return { type: "scroll", amount: -state.rows };
        }
      }
    }
    return undefined;
  });
}

const keyUpSequence = [0x1b, 0x5b, 0x41]; // ESC [ A
const keyDownSequence = [0x1b, 0x5b, 0x42]; // ESC [ B
const shiftTabSequence = [0x1b, 0x5b, 0x5a]; // ESC [ Z
const pageUpSequence = [0x1b, 0x5b, 0x35, 0x7e]; // ESC [ 5 ~
const pageDownSequence = [0x1b, 0x5b, 0x36, 0x7e]; // ESC [ 6 ~

export function escapeSequenceEquals(
  sequence: readonly number[],
  expected: readonly number[]
): boolean {
  if (sequence.length !== expected.length) {
    return false;
  }
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] !== expected[i]) {
      return false;
    }
  }
  return true;
}
