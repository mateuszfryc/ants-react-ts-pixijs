import FoodImage from 'assets/food.png';
import { Circle } from 'collisions/circle';
import { TAGS } from 'collisions/collisions';
import { SpriteWithCollisions } from 'SpriteWithCollisions';
import { Shape } from 'collisions/proxyTypes';
import { mapRangeClamped } from 'utils/math';

export class Food extends SpriteWithCollisions {
  amount: number;
  isEmpty: boolean;
  scentLifeTime: number;

  static scentLifeTime = 15;

  constructor(x: number, y: number, size = 1) {
    super(FoodImage, new Circle(x, y, size * 5, [TAGS.FOOD]) as Shape, x, y, size * 0.5);

    this.amount = size * 50;
    this.scentLifeTime = 10;
    this.isEmpty = false;
  }

  haveABite(chunk = 1): void {
    const newSize = this.scale.x - mapRangeClamped(chunk, this.amount);
    if (newSize <= 0) {
      this.isEmpty = true;
      // eslint-disable-next-line unicorn/prefer-dom-node-remove
      this.parent.removeChild(this);
      this.body.removeSelfFromCollisions();
    }
    this.scale.set(newSize);
    this.body.radius = newSize * 5;
    this.amount -= chunk;
  }
}
