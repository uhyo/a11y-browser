import { InputHandlerMethods, runIgnoreHandler } from "./inputHandler.js";
import { Stack } from "./Stack.js";

export class Terminal {
  constructor(
    private readonly output: NodeJS.WriteStream,
    private readonly input: NodeJS.ReadStream
  ) {
    runIgnoreHandler(this.registerHandler());
  }

  #inputControl: InputControl | undefined;
  #nextInputHandlerId = 1;
  #activeInputHandlerStack = new Stack<number>();
  #readableListener = () => {
    const inputControl = this.#inputControl;
    if (inputControl === undefined) {
      return;
    }
    while (true) {
      const res = process.stdin.read();
      if (res === null) {
        return;
      }
      const value = String(res).charCodeAt(0);
      if (inputControl.nextCallback) {
        inputControl.nextCallback(value);
        inputControl.nextCallback = undefined;
      } else {
        inputControl.buffer.push(value);
      }
    }
  };
  #endListener = () => {
    const inputControl = this.#inputControl;
    if (inputControl === undefined) {
      return;
    }
    if (inputControl.nextCallback) {
      inputControl.nextCallback(0);
      inputControl.nextCallback = undefined;
    } else {
      inputControl.buffer.push(0);
    }
  };
  #errorListener = (error: unknown) => {
    const inputControl = this.#inputControl;
    if (inputControl === undefined) {
      return;
    }
    if (inputControl.storedError === undefined) {
      inputControl.storedError = error;
    }
    if (inputControl.nextCallback) {
      inputControl.nextCallback(0);
      inputControl.nextCallback = undefined;
    }
  };

  public registerHandler(): InputHandlerMethods {
    const handlerId = this.#nextInputHandlerId++;
    const pull = async (): Promise<number> => {
      while (this.#activeInputHandlerStack.peek() !== handlerId) {
        // This isn't my turn to read.
        await new Promise<void>((resolve) => {
          this.#activeInputHandlerStack.notifyOnChange(resolve);
        });
      }
      const inputControl = this.#inputControl;
      if (inputControl === undefined) {
        return 0;
      }
      const data = inputControl.buffer.shift();
      if (data !== undefined) {
        return data;
      }
      return new Promise((resolve, reject) => {
        inputControl.nextCallback = (value) => {
          if (inputControl.storedError !== undefined) {
            reject(inputControl.storedError);
          } else {
            resolve(value);
          }
        };
      });
    };
    const cleanup = () => {
      this.#activeInputHandlerStack.pop();
    };
    this.#activeInputHandlerStack.push(handlerId);
    return {
      pull,
      cleanup,
    };
  }

  public start() {
    this.input.setRawMode(true);
    this.#inputControl = {
      buffer: [],
      nextCallback: undefined,
      storedError: undefined,
    };
    this.input.on("readable", this.#readableListener);
    this.input.on("end", this.#endListener);
    this.input.on("error", this.#errorListener);
  }

  public destroy() {
    this.input.setRawMode(false);
    this.#inputControl = undefined;
    this.input.removeListener("readable", this.#readableListener);
    this.input.removeListener("end", this.#endListener);
    this.input.removeListener("error", this.#errorListener);
  }
}

type InputControl = {
  /**
   * Buffer of input key codes.
   */
  buffer: number[];
  /**
   * Function to call when a key is pressed.
   */
  nextCallback: ((data: number) => void) | undefined;
  /**
   * Error that occurred during reading.
   */
  storedError: unknown;
};
