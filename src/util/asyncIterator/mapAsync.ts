export async function* mapAsync<T, U>(
  iterator: AsyncIterable<T>,
  mapper: (value: T) => U | Promise<U>
): AsyncIterableIterator<U> {
  for await (const value of iterator) {
    yield await mapper(value);
  }
}
