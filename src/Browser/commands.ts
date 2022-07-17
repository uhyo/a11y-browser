import { filterMapAsync } from "../util/asyncIterator/filterMapAsync.js";
import { InputChunk } from "./Terminal/inputChunkParser.js";

type Command =
  | "quit"
  | "scrollUp"
  | "scrollDown"
  | "tabForward"
  | "tabBackward";

export function mapInputToCommand(
  input: AsyncIterable<InputChunk>
): AsyncIterable<Command> {
  return filterMapAsync(input, (chunk) => {
    switch (chunk.type) {
      case "raw": {
        switch (chunk.value) {
          case 0:
          case 3:
            return "quit";
          case 9: // tab
            return "tabForward";
        }
        break;
      }
      case "escape-sequence": {
        if (escapeSequenceEquals(chunk.sequence, keyUpSequence)) {
          return "scrollUp";
        }
        if (escapeSequenceEquals(chunk.sequence, keyDownSequence)) {
          return "scrollDown";
        }
        if (escapeSequenceEquals(chunk.sequence, shiftTabSequence)) {
          return "tabBackward";
        }
      }
    }
    return undefined;
  });
}

const keyUpSequence = [0x1b, 0x5b, 0x41]; // ESC [ A
const keyDownSequence = [0x1b, 0x5b, 0x42]; // ESC [ B
const shiftTabSequence = [0x1b, 0x5b, 0x5a]; // ESC [ Z

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
