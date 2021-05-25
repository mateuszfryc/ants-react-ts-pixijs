import { Graphics } from 'pixi.js';

export class DebugDraw extends Graphics {
  constructor() {
    super();
    this.zIndex = 10;
  }
}
