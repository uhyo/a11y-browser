import { BrowserState } from "./BrowserState.js";
import { InputChunk } from "./Terminal/inputChunkParser.js";

/**
 * Handles input.
 *
 * @returns true if the input is handled.
 */
export function handleKeyInput(
  state: BrowserState,
  input: InputChunk
): boolean {
  if (input.type === "escape-sequence") {
    if (escapeSequenceEquals(input.sequence, keyUpSequence)) {
      state.scrollY--;
      return true;
    }
    if (escapeSequenceEquals(input.sequence, keyDownSequence)) {
      state.scrollY++;
      return true;
    }
  }
  return false;
}

const keyUpSequence = [0x1b, 0x5b, 0x41]; // ESC [ A
const keyDownSequence = [0x1b, 0x5b, 0x42]; // ESC [ B

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
