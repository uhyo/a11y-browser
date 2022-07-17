export function* joinIterables<T>(
  ...iterables: Iterable<T>[]
): Generator<T, void, undefined> {
  for (const iterable of iterables) {
    yield* iterable;
  }
}
