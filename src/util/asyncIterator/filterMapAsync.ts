export async function* filterMapAsync<T, U>(
  iterator: AsyncIterable<T>,
  mapper: (value: T) => U | undefined | Promise<U | undefined>,
): AsyncIterableIterator<U> {
  for await (const value of iterator) {
    const mapped = await mapper(value);
    if (mapped !== undefined) {
      yield mapped;
    }
  }
}
