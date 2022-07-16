type AsyncIteratorValue<I> = I extends AsyncIterator<infer T> ? T : never;

export function mergeAsync<
  Is extends readonly AsyncIterableIterator<unknown>[]
>(...iterators: Is): AsyncIterableIterator<AsyncIteratorValue<Is[number]>> {
  type Item = AsyncIteratorValue<Is[number]>;
  type InternalData =
    | {
        type: "data";
        value: Item;
      }
    | {
        type: "return";
        value: unknown;
      }
    | {
        type: "throw";
        value: unknown;
      };
  const iteratorsCount = iterators.length;
  let doneCount = 0;
  const buffer: InternalData[] = [];
  let nextCallback: ((data: InternalData) => void) | undefined;

  for (const iter of iterators) {
    (async () => {
      for await (const value of iter) {
        emit({
          type: "data",
          value: value as Item,
        });
      }
      doneCount++;
      emit({
        type: "return",
        value: undefined,
      });
    })().catch((error) => {
      emit({
        type: "throw",
        value: error,
      });
    });
  }

  function emit(data: InternalData) {
    if (nextCallback) {
      nextCallback(data);
      nextCallback = undefined;
    } else {
      buffer.push(data);
    }
  }

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      const data = buffer.shift();
      if (data !== undefined) {
        switch (data.type) {
          case "data":
            return Promise.resolve({ value: data.value, done: false });
          case "return": {
            if (doneCount === iteratorsCount) {
              return Promise.resolve({ value: undefined, done: true });
            }
            return this.next();
          }
          case "throw":
            return Promise.reject(data.value);
        }
      }
      return new Promise((resolve) => {
        nextCallback = (data) => {
          buffer.push(data);
          resolve(this.next());
        };
      });
    },
  };
}
