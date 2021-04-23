import * as PIXI from 'pixi.js';

import FoodImage from 'assets/food.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { doNTimes, mapRangeClamped } from 'utils/math';

const { random } = Math;
let lastCreatedFoodId = 0;

// export function haveABite(chunk = 1): void {
//   const newSize = this.scale.x - mapRangeClamped(chunk, this.amount);
//   if (newSize <= 0) {
//     this.isEmpty = true;
//     this.parent.removeChild(this);
//     this.body.removeSelfFromCollisions();
//   }
//   this.scale.set(newSize);
//   this.body.radius = newSize * 6;
//   this.amount -= chunk;
// }

export const foodImageTexture = PIXI.Texture.from(FoodImage);

export function spawnFood(id: number, x: number, y: number, size = 10): any {
  const foodCollisionShape = new Circle(
    x,
    y,
    size, // radius
    TAGS.FOOD,
    1, // scale
    0, // padding
    id,
  );

  const foodSprite = PIXI.Sprite.from(FoodImage);
  foodSprite.x = x;
  foodSprite.y = y;
  foodSprite.scale.set(size * 0.09);
  foodSprite.anchor.set(0.5);

  const amount = size * 50;
  const isEmpty = false;

  const properties = [amount, isEmpty];

  return [id, foodCollisionShape, foodSprite, properties];
}

export function makeSomeFood(
  useFoodCallback: (food: any) => void,
  xSpawn: number,
  ySpawn: number,
  foodAmount = 10,
  range = 100,
  size = 10,
): void {
  doNTimes((): void => {
    const x = xSpawn + (random() * range - range * 0.5);
    const y = ySpawn + (random() * range - range * 0.5);

    const [id, foodCollisionShape, foodSprite, properties] = spawnFood(
      lastCreatedFoodId,
      x,
      y,
      size,
    );
    lastCreatedFoodId++;

    useFoodCallback({ id, foodCollisionShape, foodSprite, properties });
  }, foodAmount);
}
