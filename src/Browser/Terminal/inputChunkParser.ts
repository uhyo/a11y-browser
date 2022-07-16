export type InputChunk =
  | {
      type: "escape-sequence";
      sequence: readonly number[];
    }
  | {
      type: "raw";
      value: number;
    };

export function* parseInputChunks(): Generator<InputChunk[], void, number> {
  let buffer: number[] = [];
  /**
   * 0: initial
   * 1: ESC is read
   * 2: ESC [ is read
   */
  let state = 0;
  let result: InputChunk[] = [];
  while (true) {
    const value = yield result;
    result = [];
    buffer.push(value);
    switch (state) {
      case 0: {
        if (value === 0x1b) {
          state = 1;
          continue;
        }
        break;
      }
      case 1: {
        if (value === 0x5b) {
          state = 2;
          continue;
        }
        break;
      }
      case 2: {
        // ESC sequence is terminated by 0x40~0x7e
        if (value >= 0x40 && value <= 0x7e) {
          result = [{ type: "escape-sequence", sequence: buffer }];
          buffer = [];
          state = 0;
        }
        continue;
      }
    }
    // If you reach here, you are not in an escape sequence.
    result = buffer.map((value) => ({ type: "raw", value }));
    buffer = [];
  }
}
