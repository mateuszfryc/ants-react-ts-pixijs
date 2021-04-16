export class Timer {
  counter: number;
  targetTime: number;
  to: number;
  from: number | undefined;
  callback: (() => void) | undefined;

  constructor(targetTime = 1, callback?: () => void, from?: number, to = 2) {
    this.counter = 0;
    this.targetTime = targetTime;
    this.from = from;
    this.to = to;
    this.callback = callback;
  }

  update(deltaTime: number): boolean {
    this.counter += deltaTime;
    if (this.counter >= this.targetTime) {
      this.counter = 0;
      if (this.from) {
        this.targetTime = Math.random() * (this.to - this.from) + this.from;
      }
      if (this.callback) this.callback();

      return true;
    }

    return false;
  }
}
