import * as PIXI from 'pixi.js';

import NestScentImage from 'assets/nest-scent.png';
import FoodScentImage from 'assets/food-scent.png';
import { Circle } from 'simulation/collisions/circle';
import { TAGS } from 'simulation/collisions/collisions';
import { SpriteWithCollisions } from 'simulation/SpriteWithCollisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { mapRangeClamped } from 'utils/math';

const scentInitialLifetime = 10;
const radius = 2;
const initialStrength = 16; // seconds

const { PHEROMONE_NEST } = TAGS;
export class Pheromone extends Circle {
  strength: number;

  constructor(x: number, y: number, tag: number, id: number) {
    super(x, y, radius, tag, 1, 0, id);
    this.strength = initialStrength;
  }
}
