import { Graphics } from 'pixi.js';

export type DrawableObject = { draw: (context: Graphics) => void };

export class DrawableReference {
  id: number;
  color: number;
  label: string;
  ref: DrawableObject;

  constructor(id: number, label: string, ref: DrawableObject, color = 0xff0000) {
    this.id = id;
    this.color = color;
    this.label = label;
    this.ref = ref;
  }
}
