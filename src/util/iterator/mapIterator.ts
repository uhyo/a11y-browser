export function* mapIterator<T, U>(
  iterator: Iterable<T>,
  mapper: (value: T) => U
): Generator<U> {
  for (const value of iterator) {
    yield mapper(value);
  }
}
