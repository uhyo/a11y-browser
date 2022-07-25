import EventEmitter from "events";

type TaskInQueue<Task> = {
  controller: AbortController;
  task: Task;
};

/**
 * Queue of tasks where each task can be aborted.
 */
export class TaskQueue<Task> {
  #queue: TaskInQueue<Task>[] = [];
  /**
   * EventEmitter that emits a "readable" event when the queue is newly non-empty.
   */
  readonly event = new EventEmitter();

  public push(task: Task): AbortController {
    const abortController = new AbortController();
    this.#queue.push({ controller: abortController, task });
    if (this.#queue.length === 1) {
      this.event.emit("readable");
    }
    return abortController;
  }

  public take(): TaskInQueue<Task> | undefined {
    while (true) {
      const obj = this.#queue.shift();
      if (!obj) {
        return undefined;
      }
      if (!obj.controller.signal.aborted) {
        return obj;
      }
    }
  }
}
