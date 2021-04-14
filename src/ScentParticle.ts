import NestImage from 'assets/nest-scent.png';
import { Circle } from 'collisions/circle';
import { TAGS } from 'collisions/collisions';
import { SpriteWithCollisions } from 'SpriteWithCollisions';
import { Shape } from 'collisions/proxyTypes';

export const SCENT_TYPES = {
  NEST: 0,
  FOOD: 1,
};

export class ScentParticle extends SpriteWithCollisions {
  lifeTime: number;
  type: number;

  constructor(x: number, y: number, type = SCENT_TYPES.NEST) {
    const scale = 0.25;
    super(NestImage, new Circle(x, y, scale, [TAGS.SCENT_NEST]) as Shape, x, y, scale);
    this.lifeTime = 6;
    this.type = type;
  }
}
