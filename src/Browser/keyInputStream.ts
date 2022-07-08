export function getKeyInputStream() {
  let nextCallback: ((data: number) => void) | undefined;
  let storedError: unknown;
  const buffer: number[] = [];
  const readableListener = () => {
    while (true) {
      const res = process.stdin.read();
      if (res === null) {
        return;
      }
      const value = String(res).charCodeAt(0);
      if (nextCallback) {
        nextCallback(value);
        nextCallback = undefined;
      } else {
        buffer.push(value);
      }
    }
  };
  const endListener = () => {
    if (nextCallback) {
      nextCallback(0);
      nextCallback = undefined;
    } else {
      buffer.push(0);
    }
  };
  const errorListener = (error: unknown) => {
    if (storedError === undefined) {
      storedError = error;
    }
    if (nextCallback) {
      nextCallback(0);
      nextCallback = undefined;
    }
  };
  process.stdin.setRawMode(true);
  process.stdin.on("readable", readableListener);
  process.stdin.on("end", endListener);
  process.stdin.on("error", errorListener);
  const cleanup = () => {
    process.stdin.removeListener("readable", readableListener);
    process.stdin.removeListener("end", endListener);
    process.stdin.removeListener("error", errorListener);
    process.stdin.setRawMode(false);
  };

  const iterator: AsyncIterableIterator<number> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      const data = buffer.shift();
      if (data !== undefined) {
        return Promise.resolve({ value: data, done: false });
      }
      if (storedError !== undefined) {
        return Promise.reject(storedError);
      }
      return new Promise((resolve, reject) => {
        nextCallback = (data) => {
          if (storedError !== undefined) {
            reject(storedError);
          } else {
            resolve({ value: data, done: false });
          }
        };
      });
    },
    return() {
      cleanup();
      return Promise.resolve({ value: 0, done: true });
    },
  };

  return [iterator, cleanup] as const;
}
