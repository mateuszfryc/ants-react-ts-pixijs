import { Graphics } from 'pixi.js';
import { makeObservable, observable, action } from 'mobx';

type DrawableObject = { draw: (context: Graphics) => void };

class DrawableReference {
  id: number;
  label: string;
  ref: DrawableObject;

  constructor(id: number, label: string, ref: DrawableObject) {
    this.id = id;
    this.label = label;
    this.ref = ref;
  }
}

export class DebugDraw extends Graphics {
  /** Array of objects that implement: draw method */
  queue: DrawableReference[] = [];
  drawables: DrawableReference[] = [];

  constructor() {
    super();
    makeObservable(this, {
      queue: observable,
      drawables: observable,
      registerDrawable: action,
    });
    this.zIndex = 10;
  }

  draw(): void {
    if (this.queue.length > 0) {
      this.clear();
      this.lineStyle(1, 0xff0000);
      this.queue.forEach((item): void => item.ref.draw(this));
    }
  }

  registerDrawable(item: DrawableObject, label: string): void {
    this.drawables.push(new DrawableReference(this.drawables.length + 1, label, item));
  }

  updateDrawable(drawable: DrawableReference): void {
    if (this.queue.some((item) => item.id === drawable.id)) {
      this.queue = this.queue.filter((item) => item.id !== drawable.id);
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
