export function* addNewLineToEnd(
  input: Iterable<string>
): IterableIterator<string> {
  let hadNewLineAtEnd = false;
  for (const line of input) {
    hadNewLineAtEnd = line.endsWith("\n");
    yield line;
  }
  if (!hadNewLineAtEnd) {
    yield "\n";
  }
}
