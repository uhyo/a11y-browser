export function getResizeEventStream(tty: NodeJS.WriteStream) {
  let nextCallback: (() => void) | undefined;
  let hasEvent = false;
  const resizeListener = () => {
    if (nextCallback) {
      nextCallback();
      nextCallback = undefined;
    } else {
      hasEvent = true;
    }
  };

  tty.on("resize", resizeListener);

  const cleanup = () => {
    tty.removeListener("resize", resizeListener);
  };

  const iterator: AsyncIterableIterator<undefined> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (hasEvent) {
        hasEvent = false;
        return Promise.resolve({
          value: undefined,
          done: false,
        });
      }
      return new Promise((resolve) => {
        nextCallback = () => {
          resolve({
            value: undefined,
            done: false,
          });
        };
      });
    },
    return() {
      cleanup();
      return Promise.resolve({ value: undefined, done: true });
    },
  };

  return [iterator, cleanup] as const;
}
