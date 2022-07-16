import { Terminal } from "./Terminal/index.js";

type CursorPositionQuery = {
  query: () => Promise<{ row: number; col: number }>;
  cleanup: () => void;
};

export function registerCursorPositionQuery(
  terminal: Terminal
): CursorPositionQuery {
  const { pull, cleanup } = terminal.registerHandler({
    filterMap(chunk) {
      if (chunk.type !== "escape-sequence") {
        return;
      }
      // Check if this is a DSR response.
      return parseDSRResponse(chunk.sequence);
    },
  });

  const query = () => {
    // Device Status Report (DSR)
    terminal.output.write(`\x1b[6n`);
    // Wait for the response.
    return pull();
  };

  return {
    query,
    cleanup,
  };
}

function parseDSRResponse(escapeSequence: readonly number[]) {
  // ESC [
  let index = 2;
  // Cursor Position (CPR)
  const row = parseNumber();
  // separator (;)
  if (escapeSequence[index++] !== 0x3b) {
    return;
  }
  const col = parseNumber();
  // end of sequence (R)
  if (escapeSequence[index++] !== 0x52) {
    return;
  }
  return { row, col };

  function parseNumber() {
    let value = 0;
    while (true) {
      const next = escapeSequence[index] ?? 0;
      if (next < 0x30 || next > 0x39) {
        return value;
      }
      value = value * 10 + next - 0x30;
      index++;
    }
  }
}
