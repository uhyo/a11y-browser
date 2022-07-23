import { getLogger } from "./index.js";

export let globalLogger: Console = getLogger(false);

export function setGlobalLogger(debug: boolean): void {
  globalLogger = getLogger(debug);
}
