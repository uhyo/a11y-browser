export function* addNewLineToEnd(
  input: Iterable<string>,
  when?: () => boolean,
): IterableIterator<string> {
  let hadNewLineAtEnd = false;
  for (const line of input) {
    hadNewLineAtEnd = line.endsWith("\n");
    yield line;
  }
  if (!hadNewLineAtEnd && (!when || when())) {
    yield "\n";
  }
}
