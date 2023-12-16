import { KeyInput } from "puppeteer";
import { getProperty } from "../UITree/nodeRenderers.js";
import { UINode } from "../UITree/UINode.js";
import { filterMapAsync } from "../util/asyncIterator/filterMapAsync.js";
import { BrowserState } from "./BrowserState.js";
import { InputChunk } from "./Terminal/inputChunkParser.js";

type Command =
  | { type: "quit" }
  | { type: "scroll"; amount: number }
  | { type: "scrollToTop" }
  | { type: "scrollToBottom" }
  | { type: "key"; key: KeyInput; modifiers?: KeyInput[] }
  | { type: "switchToInputMode"; target: UINode };

export function mapInputToCommand(
  state: BrowserState,
  input: AsyncIterable<InputChunk>,
): AsyncIterable<Command> {
  return filterMapAsync(input, (chunk): Command | undefined => {
    switch (state.mode.type) {
      case "normal": {
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
              case 13: {
                // enter

                // If an editable node is focused, switch to input mode.
                if (state.focusedNode?.rawNode !== undefined) {
                  const editable = getProperty(
                    state.focusedNode.rawNode,
                    "editable",
                    "",
                  );
                  if (editable) {
                    return {
                      type: "switchToInputMode",
                      target: state.focusedNode,
                    };
                  }
                }

                return {
                  type: "key",
                  key: "Enter",
                };
              }
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
            if (escapeSequenceEquals(chunk.sequence, homeSequence)) {
              return { type: "scrollToTop" };
            }
            if (escapeSequenceEquals(chunk.sequence, endSequence)) {
              return { type: "scrollToBottom" };
            }
          }
        }
        break;
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
const homeSequence = [0x1b, 0x5b, 0x48]; // ESC [ H
const endSequence = [0x1b, 0x5b, 0x46]; // ESC [ F

export function escapeSequenceEquals(
  sequence: readonly number[],
  expected: readonly number[],
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
