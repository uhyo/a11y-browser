export class SummedStack {
  #stack: number[] = [];
  #sum: number = 0;
  push(value: number) {
    this.#stack.push(value);
    this.#sum += value;
  }
  pop(): number | undefined {
    const value = this.#stack.pop();
    if (value !== undefined) {
      this.#sum -= value;
    }
    return value;
  }
  get sum(): number {
    return this.#sum;
  }
}
