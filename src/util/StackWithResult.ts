export class StackWithResult<T, U> {
  #items: T[] = [];
  #result: U;
  #getResult: (stack: readonly T[]) => U;

  constructor(getResult: (stack: readonly T[]) => U) {
    this.#getResult = getResult;
    this.#result = getResult([]);
  }

  get size(): number {
    return this.#items.length;
  }

  get result(): U {
    return this.#result;
  }

  public push(item: T): void {
    this.#items.push(item);
    this.#result = this.#getResult(this.#items);
  }

  public pop(): T | undefined {
    const res = this.#items.pop();
    this.#result = this.#getResult(this.#items);
    return res;
  }

  public peek(): T | undefined {
    return this.#items.at(-1);
  }
}
