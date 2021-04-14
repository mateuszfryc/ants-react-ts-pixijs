import NestScentImage from 'assets/nest-scent.png';
import FoodScentImage from 'assets/food-scent.png';
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

  constructor(x: number, y: number, type: number, initStrength = 1 /* float in range of 0 - 1 */) {
    const scale = 0.25;
    const isNestScent = type === SCENT_TYPES.NEST;
    super(
      isNestScent ? NestScentImage : FoodScentImage,
      new Circle(x, y, scale, [isNestScent ? TAGS.SCENT_NEST : TAGS.SCENT_FOOD]) as Shape,
      x,
      y,
      scale,
    );
    this.lifeTime = 3 * initStrength;
    this.type = type;
    this.alpha = initStrength;
  }
}
