import NestImage from 'assets/nest.png';
import { Circle } from 'collisions/circle';
import { TAGS } from 'collisions/collisions';
import { SpriteWithCollisions } from 'SpriteWithCollisions';
import { Shape } from 'collisions/proxyTypes';

const { NEST, NEST_VISIBLE_AREA } = TAGS;

export class Nest extends SpriteWithCollisions {
  areaIsVisibleIn: Shape;

  constructor(x: number, y: number, size = 1) {
    // circle in the SpriteWithCollisions type acts as a drop zone for ants with food
    super(NestImage, new Circle(x, y, size * 17, NEST) as Shape, x, y, size);

    this.areaIsVisibleIn = new Circle(x, y, size * 55, NEST_VISIBLE_AREA) as Shape;
  }
}
