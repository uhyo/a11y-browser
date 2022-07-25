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
  #taskIsRunning = false;
  /**
   * EventEmitter that emits a "readable" event when there is a task to be taken.
   */
  readonly event = new EventEmitter();

  public push(task: Task): AbortController {
    const abortController = new AbortController();
    this.#queue.push({ controller: abortController, task });
    if (!this.#taskIsRunning) {
      queueMicrotask(() => {
        this.event.emit("readable");
      });
    }
    return abortController;
  }

  /**
   * Passes the next task to the callback.
   * Promise returned from callback must resolve when the task is finished.
   */
  public take(callback: (task: TaskInQueue<Task>) => Promise<void>): void {
    while (true) {
      const obj = this.#queue.shift();
      if (!obj) {
        return;
      }
      if (!obj.controller.signal.aborted) {
        this.#taskIsRunning = true;
        callback(obj)
          .catch((err) => {
            this.event.emit("error", err);
          })
          .finally(() => {
            this.#taskIsRunning = false;
            if (this.#queue.length > 0) {
              this.event.emit("readable");
            }
          });
      }
    }
  }
}
