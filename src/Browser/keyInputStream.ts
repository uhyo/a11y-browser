import { Terminal } from "./Terminal/index.js";

export function getKeyInputStream(terminal: Terminal) {
  const { pull, cleanup } = terminal.registerHandler();

  const iterator: AsyncIterableIterator<number> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      return {
        value: await pull(),
        done: false,
      };
    },
    return() {
      cleanup();
      return Promise.resolve({ value: 0, done: true });
    },
  };

  return [iterator, cleanup] as const;
}
