import { Console } from "console";
import { createWriteStream } from "fs";
import { devNull } from "os";

export function getLogger(debug: boolean): Console {
  const outStream = debug ? process.stderr : createWriteStream(devNull);
  const console = new Console(outStream, outStream);
  return console;
}
