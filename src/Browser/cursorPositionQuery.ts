import { Terminal } from "./Terminal/index.js";

type CursorPositionQuery = {
  query: () => Promise<{ row: number; col: number }>;
  cleanup: () => void;
};

export function registerCursorPositionQuery(
  terminal: Terminal
): CursorPositionQuery {
  const { pull, cleanup } = terminal.registerHandler();

  const query = () => {
    // Device Status Report (DSR)
    terminal.output.write(`\x1b[6n`);
    // Wait for the response.
    return parseDSRResponse(pull);
  };

  return {
    query,
    cleanup,
  };
}

async function parseDSRResponse(pull: () => Promise<number>) {
  // ESC [
  assert(await pull(), 0x1b);
  assert(await pull(), 0x5b);
  // Cursor Position (CPR)
  const [row, next] = await parseNumber();
  // separator (;)
  assert(next, 0x3b);
  const [col, next2] = await parseNumber();
  // end of sequence (R)
  assert(next2, 0x52);
  return { row, col };

  async function parseNumber() {
    let value = 0;
    while (true) {
      const next = await pull();
      if (next < 0x30 || next > 0x39) {
        return [value, next] as const;
      }
      value = value * 10 + next - 0x30;
    }
  }

  function assert(actual: number, expected: number) {
    if (actual !== expected) {
      throw new Error(
        `Unexpected response from terminal during DSR. Expected ${expected}, got ${actual}`
      );
    }
  }
}
