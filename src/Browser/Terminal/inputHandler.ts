export type InputHandlerMethods = {
  pull: () => Promise<number>;
  cleanup: () => void;
};

export const runIgnoreHandler = ({ pull }: InputHandlerMethods) => {
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
