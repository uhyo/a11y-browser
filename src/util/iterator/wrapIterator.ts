export function* wrapIterator<T>(value: T): IterableIterator<T> {
  yield value;
}
