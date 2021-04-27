import * as PIXI from 'pixi.js';

import NestScentImage from 'assets/nest-scent.png';
import FoodScentImage from 'assets/food-scent.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { SpriteWithCollisions } from 'simulation/SpriteWithCollisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { mapRangeClamped } from 'utils/math';

const scentInitialLifetime = 48;

const { PHEROMONE_NEST } = TAGS;
export class Pheromone extends SpriteWithCollisions {
  strength: number;
  initLifetime: number;
  id: number;
  antId: number;
  pointsToDirection: number;

  static scentInitialLifetime = scentInitialLifetime;

  constructor(
    x: number,
    y: number,
    tag: number,
    initStrength = 8, // seconds
    id: number,
    antId: number,
    pointsToDirection: number,
  ) {
    const scale = 0.25;
    const isNestScent = tag === PHEROMONE_NEST;
    super(
      isNestScent ? NestScentImage : FoodScentImage,
      new Circle(x, y, scale * 32, tag) as Shape,
      x,
      y,
      scale,
    );
    this.initLifetime = initStrength;
    this.strength = initStrength;
    this.id = id;
    this.antId = antId;
    this.alpha = 1;
    this.pointsToDirection = pointsToDirection;

    this.body.spriteRef = this as PIXI.Sprite;
  }

  update(deltaTime: number): boolean {
    this.strength -= deltaTime * 0.5;
    this.alpha = mapRangeClamped(this.strength, this.initLifetime);

    return this.strength <= 0;
  }
}
