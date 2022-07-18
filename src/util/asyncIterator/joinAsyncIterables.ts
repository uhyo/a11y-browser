export async function* joinAsyncIterables<T>(
  ...iterables: AsyncIterable<T>[]
): AsyncGenerator<T, void, undefined> {
  for (const iterable of iterables) {
    yield* iterable;
  }
}
