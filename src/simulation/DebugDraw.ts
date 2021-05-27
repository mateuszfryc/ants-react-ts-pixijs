import { Graphics } from 'pixi.js';
import { makeObservable, observable, action } from 'mobx';
import { DrawableObject, DrawableReference } from './DrawableReference';

export class DebugDraw extends Graphics {
  /** Array of objects that implement: draw method */
  queue: DrawableReference[] = [];
  drawables: DrawableReference[] = [];

  constructor() {
    super();
    makeObservable(this, {
      queue: observable,
      drawables: observable,
      updateQueue: action,
      registerDrawable: action,
    });
    this.zIndex = 10;
  }

  draw(): void {
    if (this.queue.length > 0) {
      this.clear();
      this.lineStyle(1, 0xff0000);
      this.queue.forEach((item): void => {
        this.lineStyle(1, item.color);
        item.ref.draw(this);
      });
    }
  }

  registerDrawable(item: DrawableObject, label: string, color = 0xff0000): void {
    this.drawables.push(new DrawableReference(this.drawables.length + 1, label, item, color));
  }

  updateQueue(newQueue: DrawableReference[]): void {
    this.queue = newQueue;
  }

  updateDrawable(drawable: DrawableReference): void {
    if (this.queue.some((item) => item.id === drawable.id)) {
      this.updateQueue(this.queue.filter((item) => item.id !== drawable.id));
      this.clear();

      return;
    }
    this.queue.push(drawable);
    this.clear();
  }

  clearReferences(): void {
    this.drawables = [];
    this.queue = [];
  }
}
