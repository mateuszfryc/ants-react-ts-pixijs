import * as PIXI from 'pixi.js';

import NestScentImage from 'assets/nest-scent.png';
import FoodScentImage from 'assets/food-scent.png';
import { CircleMinimal, setupCircleMinimalCollisions } from './collisions/circlesMinimalCollisions';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';

const { ANT_SENSOR, PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;

const radius = 2;
/** Time before pheromone will decay (in seconds) */
export const pheromonesLifeSpan = 32;

export class Pheromone extends CircleMinimal {
  emissionTimeStamp: number;

  constructor(id: number, x: number, y: number, tag: number, emissionTimeStamp: number) {
    super(id, x, y, radius, 1, tag);
    this.emissionTimeStamp = emissionTimeStamp;
  }
}

const {
  insert,
  remove,
  update,
  getPotentials,
  areCirclesColliding,
} = setupCircleMinimalCollisions();
export const sensorScale = 0.14;
export const sensorForwardDistance = 3.3;
export const sensorsSideDistance = 0.66;
export const sensorsSideSpread = 0.6;
export const sensorsTurnInterpolationSpeed = 24;
export const pheromones = new Map<number, Pheromone>();
export const pheromonesSpritesMap = new Map<number, PIXI.Sprite>();
export const pheromoneEmissionTimer = new Timer(0.2);
export const nestPheromoneTexture = PIXI.Texture.from(NestScentImage);
export const foodPheromoneTexture = PIXI.Texture.from(FoodScentImage);

export const setupAntsPheromonesSensors = (antsScale: number): any => {
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
  const sensorLeft = new CircleMinimal(-1, 0, 0, antsScale * sensorScale, ANT_SENSOR);
  const sensorForward = new CircleMinimal(-2, 0, 0, antsScale * sensorScale, ANT_SENSOR);
  const sensorRight = new CircleMinimal(-3, 0, 0, antsScale * sensorScale, ANT_SENSOR);

  insert(sensorLeft);
  insert(sensorForward);
  insert(sensorRight);

  function updateAntSensors(
    x: number,
    y: number,
    xVelocity: number,
    yVelocity: number,
    hasFood: boolean,
  ) {
    const xBase = xVelocity * antsScale;
    const yBase = yVelocity * antsScale;
    let frontSensorInputSum = 0;
    let leftSensorInputSum = 0;
    let rightSensorInputSum = 0;
    sensorForward.x = x + xBase * sensorForwardDistance;
    sensorForward.y = y + yBase * sensorForwardDistance;
    sensorLeft.x =
      x +
      xBase * (sensorForwardDistance * sensorsSideDistance) -
      yVelocity * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorLeft.y =
      y +
      yBase * (sensorForwardDistance * sensorsSideDistance) +
      xVelocity * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorRight.x =
      x +
      xBase * (sensorForwardDistance * sensorsSideDistance) +
      yVelocity * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorRight.y =
      y +
      yBase * (sensorForwardDistance * sensorsSideDistance) -
      xVelocity * (sensorForwardDistance * sensorsSideSpread) * antsScale;

    update();

    for (const other of getPotentials(sensorForward)) {
      if (
        areCirclesColliding(sensorForward, other) &&
        other.tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD)
      )
        frontSensorInputSum += 1;
    }

    for (const other of getPotentials(sensorLeft)) {
      if (
        areCirclesColliding(sensorLeft, other) &&
        other.tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD)
      )
        leftSensorInputSum += 1;
    }

    for (const other of getPotentials(sensorRight)) {
      if (
        areCirclesColliding(sensorRight, other) &&
        other.tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD)
      )
        rightSensorInputSum += 1;
    }

    return [frontSensorInputSum, leftSensorInputSum, rightSensorInputSum];
  }

  return {
    sensorLeft,
    sensorForward,
    sensorRight,
    updateAntSensors,
    addPheromoneShape: insert,
    removePheromoneShape: remove,
  };
};
