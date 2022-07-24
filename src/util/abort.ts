export class AbortError extends Error {
  constructor() {
    super("Aborted");
    this.name = "AbortError";
  }
}

export function checkAbort(abortSignal: AbortSignal): void {
  if (abortSignal.aborted) {
    throw new AbortError();
  }
}

export function ignoreAbort(error: unknown): asserts error is AbortError {
  if (error instanceof AbortError) {
    return;
  }
  throw error;
}
