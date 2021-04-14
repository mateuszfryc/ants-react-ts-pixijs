import NestImage from 'assets/nest.png';
import { Circle } from 'collisions/circle';
import { TAGS } from 'collisions/collisions';
import { SpriteWithCollisions } from 'SpriteWithCollisions';
import { Shape } from 'collisions/proxyTypes';

export class Anthill extends SpriteWithCollisions {
  constructor(x: number, y: number) {
    super(NestImage, new Circle(x, y, 18, [TAGS.NEST]) as Shape, x, y);
  }
}
