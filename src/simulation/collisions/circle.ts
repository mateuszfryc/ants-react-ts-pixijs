import * as PIXI from 'pixi.js';

import { Body } from 'simulation/collisions/body';

export class Circle extends Body {
  radius: number;
  scale: number;

  constructor(x = 0, y = 0, radius = 0, tag = 0, scale = 1, padding = 0) {
    super(x, y, padding, tag);

    this.radius = radius;
    this.scale = scale;
  }

  draw(context: PIXI.Graphics): void {
    const { x, y } = this;
    const radius = this.radius * this.scale;

    context.moveTo(x + radius, y);
    context.drawCircle(x, y, radius);
  }
}
