/**
 * Stack with change notification
 */
export class Stack<T> {
  #changeCallbacks: (() => void)[] = [];
  #items: T[] = [];
  constructor() {}

  get size(): number {
    return this.#items.length;
  }

  public push(item: T): void {
    this.#items.push(item);
    this.#notifyChange();
  }

  public pop(): T | undefined {
    const item = this.#items.pop();
    if (item !== undefined) {
      this.#notifyChange();
    }
    return item;
  }

  public peek(): T | undefined {
    return this.#items.at(-1);
  }

  public notifyOnChange(callback: () => void) {
    const handler = () => {
      callback();
      const index = this.#changeCallbacks.indexOf(handler);
      if (index !== -1) {
        this.#changeCallbacks.splice(index, 1);
      }
    };

    this.#changeCallbacks.push(handler);
  }

  #notifyChange() {
    for (const callback of this.#changeCallbacks) {
      callback();
    }
  }
}
