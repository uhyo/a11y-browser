export function* mapIterator<T, U>(
  iterator: IterableIterator<T>,
  mapper: (value: T) => U
): IterableIterator<U> {
  for (const value of iterator) {
    yield mapper(value);
  }
}
