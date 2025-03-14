import * as PIXI from 'pixi.js';

import { Shape } from 'simulation/collisions/proxyTypes';

export class SpriteWithCollisions extends PIXI.Sprite {
  body: Shape;

  constructor(imageUrl: string, shape: Shape, x = 0, y = 0, scale = 1 /* , rotation = 0 */) {
    super(PIXI.Texture.from(imageUrl));
    this.body = shape;
    this.x = x;
    this.y = y;
    this.anchor.set(0.5);
    this.scale.set(scale);

    this.body.x = x;
    this.body.y = y;
  }
}
