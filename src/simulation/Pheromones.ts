import * as PIXI from 'pixi.js';

import NestScentImage from 'assets/nest-scent.png';
import FoodScentImage from 'assets/food-scent.png';
import { CircleMinimal, setupCircleMinimalCollisions } from './collisions/circlesMinimalCollisions';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';

const { ANT_SENSOR, PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;

export const sensorsTurnInterpolationSpeed = 8;
export const pheromones = new Map<number, Pheromone>();
export const pheromonesSpritesMap = new Map<number, PIXI.Sprite>();
export const nestPheromoneTexture = PIXI.Texture.from(NestScentImage);
export const foodPheromoneTexture = PIXI.Texture.from(FoodScentImage);

let radius = 0.66;
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
const sensorScale = 0.18;
const sensorForwardDistance = 3.6;
const sensorsSideDistance = 0.46;
const sensorsSideSpread = 0.7;

export const setupAntsPheromonesSensors = (
  antsScale: number,
  foodPheromonesSprites: PIXI.ParticleContainer,
  nestPheromonesSprites: PIXI.ParticleContainer,
): any => {
  radius *= antsScale;
  const pheromoneEmissionTimer = new Timer(0.066 * antsScale);
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
    frameStartTime: number,
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
        frontSensorInputSum += frameStartTime - other.emissionTimeStamp;
    }

    for (const other of getPotentials(sensorLeft)) {
      if (
        areCirclesColliding(sensorLeft, other) &&
        other.tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD)
      )
        leftSensorInputSum += frameStartTime - other.emissionTimeStamp;
    }

    for (const other of getPotentials(sensorRight)) {
      if (
        areCirclesColliding(sensorRight, other) &&
        other.tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD)
      )
        rightSensorInputSum += frameStartTime - other.emissionTimeStamp;
    }

    return [frontSensorInputSum, leftSensorInputSum, rightSensorInputSum, pheromoneEmissionTimer];
  }

  function updatePheromones(frameStartTime: number) {
    pheromones.forEach(({ emissionTimeStamp, id }: Pheromone): void => {
      let lifeSpan = (frameStartTime - emissionTimeStamp) / 1000;
      const sprite = pheromonesSpritesMap.get(id)!;
      if (lifeSpan >= pheromonesLifeSpan) {
        const circle = pheromones.get(id);
        if (circle) {
          remove(circle);
          pheromones.delete(id);
        }
        foodPheromonesSprites.removeChild(sprite);
        nestPheromonesSprites.removeChild(sprite);
        pheromonesSpritesMap.delete(id);
      } else {
        sprite.alpha = 1 - lifeSpan / pheromonesLifeSpan;
      }
    });
  }

  return {
    sensorLeft,
    sensorForward,
    sensorRight,
    updateAntSensors,
    updatePheromones,
    addPheromoneShape: insert,
    removePheromoneShape: remove,
    pheromoneEmissionTimer,
    drawAntSensors: (context: PIXI.Graphics) => {
      sensorLeft.draw(context);
      sensorForward.draw(context);
      sensorRight.draw(context);
    },
  };
};
