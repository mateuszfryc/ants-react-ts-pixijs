export class Timer {
  counter: number;
  targetTime: number;
  to: number;
  from: number;
  randomTarget: boolean;
  callback: () => void;

  constructor(callback: () => void, targetTime = 1, randomTarget = false, from = 1, to = 2) {
    this.counter = 0;
    this.targetTime = targetTime;
    this.randomTarget = randomTarget;
    this.from = from;
    this.to = to;
    this.callback = callback;
  }

  update(deltaTime: number): boolean {
    // eslint-disable-next-line no-plusplus
    this.counter += deltaTime;
    if (this.counter >= this.targetTime) {
      this.counter = 0;
      if (this.randomTarget) {
        this.targetTime = Math.random() * (this.to - this.from) + this.from;
      }
      this.callback();

      return true;
    }

    return false;
  }
}
