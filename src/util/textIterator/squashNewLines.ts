export function* squashNewLines(
  input: Iterable<string>
): IterableIterator<string> {
  for (const chunk of input) {
    let lfIndex = -1;
    while (true) {
      const next = chunk.indexOf("\n", lfIndex + 1);
      if (next === lfIndex + 1) {
        // Detected newline followed by newline.
        lfIndex = next;
        continue;
      }
      if (next === -1) {
        // No newline found.
        yield chunk.slice(lfIndex + 1);
        break;
      }
      // Yield line including newline.
      yield chunk.slice(lfIndex + 1, next + 1);
      lfIndex = next;
    }
  }
}
