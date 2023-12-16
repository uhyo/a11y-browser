/**
 * Split input sequence by \n.
 * Yielded values do not contain \n.
 */
export function* splitByLines(
  input: Iterable<string>,
): IterableIterator<string> {
  let chunk = "";
  for (const line of input) {
    const lfIndex = line.indexOf("\n");
    if (lfIndex >= 0) {
      // Yield line without \n.
      yield chunk + line.substring(0, lfIndex);
      chunk = line.substring(lfIndex + 1);
    } else {
      chunk += line;
    }
  }
  if (chunk.length > 0) {
    yield chunk;
  }
}
