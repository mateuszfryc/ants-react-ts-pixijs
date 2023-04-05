import { ParticleContainer, Sprite, Texture } from 'pixi.js';

import FoodImage from 'assets/food.png';
import { Circle } from 'simulation/collisions/circle';
import { Collisions, TAGS } from 'simulation/collisions/collisions';
import { randomUnitVector } from '../shared/math';
import { Shape } from './collisions/proxyTypes';

type SpawnFoodInAreaArgs = {
  location: [number, number];
  amount?: number;
  count?: number;
  radius?: number;
};

export class Food {
  lastCreatedFoodId = 0;
  foodTexture = Texture.from(FoodImage);
  crumbsCount: number;
  collisions: Collisions;
  spritesParticles: ParticleContainer;
  /**
   * Maps allow for quick access
   * to sprites and collisions shapes
   */
  shapes = new Map<number, Circle>();
  sprites = new Map<number, Sprite>();

  constructor(collisions: Collisions, crumbsCount = 10000) {
    this.collisions = collisions;
    this.crumbsCount = crumbsCount;
    this.spritesParticles = new ParticleContainer(crumbsCount, {
      position: true,
      scale: true,
      rotation: true,

      tint: false,
      alpha: false,
      uvs: false,
      vertices: false,
    });
    this.spritesParticles.zIndex = 4;
  }

  public spawnOneCrumb(x: number, y: number): void {
    if (this.lastCreatedFoodId >= this.crumbsCount) return;

    const { lastCreatedFoodId: id } = this;
    const collisionShape = new Circle(
      x,
      y,
      15, // radius
      TAGS.FOOD,
      1, // scale
      0, // padding
      id,
    );

    const foodSprite = Sprite.from(this.foodTexture);
    foodSprite.x = x;
    foodSprite.y = y;
    foodSprite.scale.set(0.2);
    foodSprite.anchor.set(0.5);

    this.spritesParticles.addChild(foodSprite);
    this.sprites.set(id, foodSprite);
    this.collisions.insert(collisionShape as Shape);
    this.shapes.set(id, collisionShape);
    this.lastCreatedFoodId++;
  }

  public pickUpCrumb(id: number): void {
    /** Picked up crumb doesn't need collision shape anymore. */
    this.collisions.remove(this.shapes.get(id) as Shape);
    this.shapes.delete(id);
    this.sprites.get(id)?.anchor.set(0.5, -0.8);
  }

  public remove(id: number): void {
    let sprite = this.sprites.get(id);
    this.sprites.delete(id);
    this.spritesParticles.removeChild(sprite!);
    sprite = undefined;
  }

  public spawnFoodInArea({ location, count = 10, radius = 100 }: SpawnFoodInAreaArgs): void {
    const { random } = Math;
    let i = 0;
    for (i; i < count; i++) {
      const x = location[0] + (random() * radius - radius * 0.5);
      const y = location[1] + (random() * radius - radius * 0.5);

      this.spawnOneCrumb(x, y);
    }
  }

  public spawnFoodInCircle({ location, count = 10, radius = 100 }: SpawnFoodInAreaArgs): void {
    let i = 0;
    for (i; i < count; i++) {
      let [xl, yl] = location;
      const [xu, yu] = randomUnitVector();
      xl += xu * radius;
      yl += yu * radius;

      this.spawnOneCrumb(xl, yl);
    }
  }
}
