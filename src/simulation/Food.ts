import { Texture, Sprite } from 'pixi.js';

import FoodImage from 'assets/food.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { doNTimes } from 'utils/do-n-times';

type Props = [number, number];
export type Food = [number, Circle, Sprite, Props];

export class FoodSource {
  imageTexture = Texture.from(FoodImage);
  lastCreatedFoodId = 0;
  bitesSpritesMap = new Map<number, Sprite>();
  collisionShapes = new Map<number, Circle>();
  sprites = new Map<number, Sprite>();
  props = new Map<number, Props>();

  /**
   * Food chunk with specified amount
   * of bites that can be harvested.
   */
  public spawnFoodPatch(x: number, y: number, radius = 20, density = 50): Food {
    const { lastCreatedFoodId: id } = this;
    const collisionShape = new Circle(
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

    const amount = radius * density;
    const isEmpty = 0;
    const props: Props = [amount, isEmpty];

    this.collisionShapes.set(id, collisionShape);
    this.sprites.set(id, foodSprite);
    this.props.set(id, props);
    this.lastCreatedFoodId++;

    return [id, collisionShape, foodSprite, [amount, isEmpty]];
  }

  /**
   * Spawn few food bites in an area.
   * Pass callback for additional setup.
   */
  public spawnFoodInArea(
    useFoodCallback: (food: Food) => void,
    xSpawn: number,
    ySpawn: number,
    density = 50,
    patchesInArea = 10,
    range = 100,
    radius = 20,
  ): void {
    const { random } = Math;
    doNTimes((): void => {
      const x = xSpawn + (random() * range - range * 0.5);
      const y = ySpawn + (random() * range - range * 0.5);

      useFoodCallback(this.spawnFoodPatch(x, y, radius, density));
    }, patchesInArea);
  }
}
