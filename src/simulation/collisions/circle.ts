import * as PIXI from 'pixi.js';

import { Body } from 'simulation/collisions/body';

const { sin, cos } = Math;

export class Circle extends Body {
  radius: number;
  scale: number;

  constructor(x = 0, y = 0, radius = 0, tag = 0, scale = 1, padding = 0, id = 0) {
    super(x, y, padding, tag, id);

    this.radius = radius;
    this.scale = scale;
  }

  draw(context: PIXI.Graphics): void {
    const { x, y, xv, yv, radius: radiusWithoutScale, scale } = this;
    const radius = radiusWithoutScale * scale;

    context.moveTo(x + radius, y);
    context.drawCircle(x, y, radius);
    // draw angle indicator
    context.moveTo(x, y);
    context.lineTo(x + xv * radius, y + yv * radius);
  }
}
