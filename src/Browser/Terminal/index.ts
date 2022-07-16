import { InputChunk, parseInputChunks } from "./inputChunkParser.js";
import { InputHandlerMethods, RegisterHandlerOptions } from "./inputHandler.js";

export class Terminal {
  /**
   * Currently registered input receivers.
   * Earlier receiver has higher priority.
   */
  #inputControls: InputReceiver<any>[] = [];
  #inputChunkParser: ReturnType<typeof parseInputChunks>;

  constructor(
    readonly output: NodeJS.WriteStream,
    private readonly input: NodeJS.ReadStream
  ) {
    this.#inputChunkParser = parseInputChunks();
    this.#inputChunkParser.next();
  }

  #readableListener = () => {
    while (true) {
      const res = process.stdin.read();
      if (res === null) {
        return;
      }
      const chunks: InputChunk[] = [];
      for (let i = 0; i < res.length; i++) {
        const value = String(res).charCodeAt(i);
        const parsed = this.#inputChunkParser.next(value);
        if (parsed.done) {
          throw new Error("Unexpected end of input");
        }
        chunks.push(...parsed.value);
      }
      for (const chunk of chunks) {
        for (const control of this.#inputControls) {
          const mapped = control.filterMap(chunk);
          if (mapped === undefined) {
            continue;
          }
          if (control.nextCallback) {
            control.nextCallback(mapped);
            control.nextCallback = undefined;
          } else {
            control.buffer.push(chunk);
          }
          break;
        }
      }
    }
  };
  #endListener = () => {
    for (const control of this.#inputControls) {
      if (control.nextCallback) {
        control.nextCallback({
          type: "raw",
          value: 0,
        });
        control.nextCallback = undefined;
      } else {
        control.buffer.push({
          type: "raw",
          value: 0,
        });
      }
    }
  };
  #errorListener = (error: unknown) => {
    for (const control of this.#inputControls) {
      if (control.storedError === undefined) {
        control.storedError = error;
      }
      if (control.nextCallback) {
        control.nextCallback({
          type: "raw",
          value: 0,
        });
        control.nextCallback = undefined;
      }
    }
  };

  public registerHandler<T>({
    filterMap,
  }: RegisterHandlerOptions<T>): InputHandlerMethods<T> {
    const inputControl: InputReceiver<T> = {
      filterMap,
      buffer: [],
      nextCallback: undefined,
      storedError: undefined,
    };
    const pull = async (): Promise<T> => {
      const chunk = inputControl.buffer.shift();
      if (chunk !== undefined) {
        return chunk;
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
    this.#inputControls.unshift(inputControl);
    const cleanup = () => {
      this.#inputControls = this.#inputControls.filter(
        (control) => control !== inputControl
      );
    };
    return {
      pull,
      cleanup,
    };
  }

  public start() {
    this.input.setRawMode(true);
    this.input.on("readable", this.#readableListener);
    this.input.on("end", this.#endListener);
    this.input.on("error", this.#errorListener);
  }

  public destroy() {
    this.input.setRawMode(false);
    this.input.removeListener("readable", this.#readableListener);
    this.input.removeListener("end", this.#endListener);
    this.input.removeListener("error", this.#errorListener);
  }
}

type InputReceiver<T> = {
  /**
   * Checks whether this handler receives given chunk.
   */
  filterMap: (chunk: InputChunk) => T | undefined;
  /**
   * Buffer of input key codes.
   */
  buffer: T[];
  /**
   * Function to call when a key is pressed.
   */
  nextCallback: ((data: T) => void) | undefined;
  /**
   * Error that occurred during reading.
   */
  storedError: unknown;
};
