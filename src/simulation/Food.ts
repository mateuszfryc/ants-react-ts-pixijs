import { Texture, Sprite } from 'pixi.js';

import FoodImage from 'assets/food.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { doNTimes } from 'utils/do-n-times';

const { random } = Math;
let lastCreatedFoodId = 0;

export function spawnFood(id: number, x: number, y: number, radius = 20): any {
  const foodCollisionShape = new Circle(
    x,
    y,
    radius, // radius
    TAGS.FOOD,
    0.7, // scale
    0, // padding
    id,
  );

  const foodSprite = Sprite.from(FoodImage);
  foodSprite.x = x;
  foodSprite.y = y;
  foodSprite.scale.set(radius * 0.022);
  foodSprite.anchor.set(0.5);

  const amount = radius * 50;
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
  radius = 20,
): void {
  doNTimes((): void => {
    const x = xSpawn + (random() * range - range * 0.5);
    const y = ySpawn + (random() * range - range * 0.5);

    const [id, foodCollisionShape, foodSprite, properties] = spawnFood(
      lastCreatedFoodId,
      x,
      y,
      radius,
    );
    lastCreatedFoodId++;

    useFoodCallback({ id, foodCollisionShape, foodSprite, properties });
  }, foodAmount);
}

export const foodImageTexture = Texture.from(FoodImage);
export const foodSprites = new Map<number, Sprite>();
export const foodBitesSpritesMap = new Map<number, Sprite>();
export const foodCollisionShapes = new Map<number, Circle>();
export const foodProps = new Map<number, number[]>();
