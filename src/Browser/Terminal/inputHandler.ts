import { InputChunk } from "./inputChunkParser.js";

export type RegisterHandlerOptions<T> = {
  filterMap: (chunk: InputChunk) => T | undefined;
};

export type InputHandlerMethods<T> = {
  pull: () => Promise<T>;
  cleanup: () => void;
};

export const runIgnoreHandler = ({ pull }: InputHandlerMethods<true>) => {
  const iter = loop();
  return () => {
    iter.return();
  };

  async function* loop() {
    while (true) {
      yield await pull();
    }
  }
};
