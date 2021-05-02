import * as PIXI from 'pixi.js';

import NestScentImage from 'assets/nest-scent.png';
import FoodScentImage from 'assets/food-scent.png';
import { CircleMinimal, CirclesMinimalCollisionsBVH } from './collisions/circlesMinimalCollisions';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';

const radius = 2;
/** Time before pheromone will decay (in seconds) */
export const pheromoneInitialLifeSpan = 32;

export class Pheromone extends CircleMinimal {
  lifeSpan: number;

  constructor(id: number, x: number, y: number, tag: number) {
    super(id, x, y, radius, 1, tag);
    this.lifeSpan = pheromoneInitialLifeSpan;
  }
}

export const pheromonesCollisions = new CirclesMinimalCollisionsBVH();
export const sensorScale = 0.14;
export const sensorForwardDistance = 3.3;
export const sensorsSideDistance = 0.66;
export const sensorsSideSpread = 0.6;
export const sensorsTurnInterpolationSpeed = 24;
export const pheromones = new Map<number, Pheromone>();
export const pheromonesSprites = new Map<number, PIXI.Sprite>();
export const pheromoneEmissionTimer = new Timer(0.2);
export const nestPheromoneTexture = PIXI.Texture.from(NestScentImage);
export const foodPheromoneTexture = PIXI.Texture.from(FoodScentImage);

export const setupAntsSensors = (antsScale: number): any => {
  /**
   * Below are three collision shapes that will be used
   * to sample area before each ant. Left, center and right
   * collision circles will sample pheromones collison
   * shapes and sum strength of pheromones found in each
   * sensor circle and based on that ant will either move
   * forward, turn left or turn right.
   * There are only three circles, their position will change
   * at update step of each ant. It allows to avoid creating
   * these collisions sensory shapes for each ant.
   */
  const sensorLeft = new CircleMinimal(-1, 0, 0, antsScale * sensorScale, TAGS.ANT_SENSOR);
  const sensorForward = new CircleMinimal(-2, 0, 0, antsScale * sensorScale, TAGS.ANT_SENSOR);
  const sensorRight = new CircleMinimal(-3, 0, 0, antsScale * sensorScale, TAGS.ANT_SENSOR);

  pheromonesCollisions.insert(sensorLeft);
  pheromonesCollisions.insert(sensorForward);
  pheromonesCollisions.insert(sensorRight);

  return {
    sensorLeft,
    sensorForward,
    sensorRight,
  };
};
