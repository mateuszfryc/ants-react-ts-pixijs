import NestImage from 'assets/nest.png';
import { Circle } from 'collisions/circle';
import { TAGS } from 'collisions/collisions';
import { SpriteWithCollisions } from 'SpriteWithCollisions';
import { Shape } from 'collisions/proxyTypes';

export class Nest extends SpriteWithCollisions {
  scentLifeTime: number;

  constructor(x: number, y: number, size = 1) {
    super(NestImage, new Circle(x, y, size * 18, [TAGS.NEST]) as Shape, x, y, size);

    this.scentLifeTime = 8;
  }
}
