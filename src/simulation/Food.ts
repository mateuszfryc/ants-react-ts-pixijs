import FoodImage from 'assets/food.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { SpriteWithCollisions } from 'simulation/SpriteWithCollisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { mapRangeClamped } from 'utils/math';

const { FOOD, FOOD_SCENT_AREA } = TAGS;

export class Food extends SpriteWithCollisions {
  amount: number;
  isEmpty: boolean;
  scentArea: Shape;

  constructor(x: number, y: number, size = 1) {
    super(FoodImage, new Circle(x, y, size * 6, FOOD) as Shape, x, y, size * 0.5);

    this.amount = size * 50;
    this.isEmpty = false;
    this.scentArea = new Circle(x, y, size * 16, FOOD_SCENT_AREA) as Shape;
  }

  haveABite(chunk = 1): void {
    const newSize = this.scale.x - mapRangeClamped(chunk, this.amount);
    if (newSize <= 0) {
      this.isEmpty = true;
      this.parent.removeChild(this);
      this.body.removeSelfFromCollisions();
    }
    this.scale.set(newSize);
    this.body.radius = newSize * 6;
    this.amount -= chunk;
  }
}
