import * as PIXI from 'pixi.js';

import NestScentImage from 'assets/nest-scent.png';
import FoodScentImage from 'assets/food-scent.png';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';
import { setupCollisions } from './pheromonesCollisions';

const { ANT_SENSOR, PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
const { max } = Math;

let pheromoneRadius = 0.66;

export function setupAntsPheromones(
  maxPheromonesCount: number,
  antsScale: number,
  foodPheromonesSprites: PIXI.ParticleContainer,
  nestPheromonesSprites: PIXI.ParticleContainer,
): any {
  const {
    arePheromonesOverlapping,
    bodies,
    brachIndexes: { AABB_leftIndex, AABB_topIndex, AABB_rightIndex, AABB_bottomIndex },
    branches,
    getPotentials,
    insert,
    pheromoneBodyIndexes: { xIndex, yIndex, radiusIndex, tagIndex, spawnTimeIndex },
    remove,
  } = setupCollisions(maxPheromonesCount);
  const { Sprite } = PIXI;
  /** Time before pheromone will decay (in seconds) */
  const pheromonesMaxLifeSpan = 32;
  const pheromonesSpritesMap = new Map<number, PIXI.Sprite>();
  const nestPheromoneTexture = PIXI.Texture.from(NestScentImage);
  const foodPheromoneTexture = PIXI.Texture.from(FoodScentImage);
  const sensorForwardDistance = 3.6;
  const sensorsSideDistance = 0.46;
  const sensorsSideSpread = 0.7;
  pheromoneRadius *= antsScale;
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
  const sensors: number[][] = [0, 1, 2].map((id: number): number[] => {
    const sensor: number[] = bodies[id];
    sensor[tagIndex] = ANT_SENSOR;
    sensor[radiusIndex] = 1.5 * antsScale;

    return sensor;
  });

  const [sensorLeft, sensorForward, sensorRight] = sensors;

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
    let tag = hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD;
    sensorForward[xIndex] = x + xBase * sensorForwardDistance;
    sensorForward[yIndex] = y + yBase * sensorForwardDistance;
    sensorLeft[xIndex] =
      x +
      xBase * (sensorForwardDistance * sensorsSideDistance) -
      yVelocity * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorLeft[yIndex] =
      y +
      yBase * (sensorForwardDistance * sensorsSideDistance) +
      xVelocity * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorRight[xIndex] =
      x +
      xBase * (sensorForwardDistance * sensorsSideDistance) +
      yVelocity * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorRight[yIndex] =
      y +
      yBase * (sensorForwardDistance * sensorsSideDistance) -
      xVelocity * (sensorForwardDistance * sensorsSideSpread) * antsScale;

    sensors.forEach((body: number[]) => {
      const [id, xB, yB, radiusB] = body;
      const branch = branches[id];

      if (
        xB - radiusB < branch[AABB_leftIndex] ||
        yB - radiusB < branch[AABB_topIndex] ||
        xB + radiusB > branch[AABB_rightIndex] ||
        yB + radiusB > branch[AABB_bottomIndex]
      ) {
        remove(body);
        insert(body);
      }
    });

    let frontSensorInputSum = 0;
    let leftSensorInputSum = 0;
    let rightSensorInputSum = 0;

    for (const other of getPotentials(sensorForward)) {
      if (arePheromonesOverlapping(sensorForward, other) && other[tagIndex] === tag)
        frontSensorInputSum += frameStartTime - other[spawnTimeIndex];
    }

    for (const other of getPotentials(sensorLeft)) {
      if (arePheromonesOverlapping(sensorLeft, other) && other[tagIndex] === tag)
        leftSensorInputSum += frameStartTime - other[spawnTimeIndex];
    }

    for (const other of getPotentials(sensorRight)) {
      if (arePheromonesOverlapping(sensorRight, other) && other[tagIndex] === tag)
        rightSensorInputSum += frameStartTime - other[spawnTimeIndex];
    }

    let haveFoundPheromone = false;
    let velocityTargetX = 0;
    let velocityTargetY = 0;

    if (frontSensorInputSum > max(leftSensorInputSum, rightSensorInputSum)) {
      velocityTargetX = sensorForward[xIndex] - x;
      velocityTargetY = sensorForward[yIndex] - y;
      haveFoundPheromone = true;
    } else if (leftSensorInputSum > rightSensorInputSum) {
      velocityTargetX = sensorLeft[xIndex] - x;
      velocityTargetY = sensorLeft[yIndex] - y;
      haveFoundPheromone = true;
    } else if (rightSensorInputSum > leftSensorInputSum) {
      velocityTargetX = sensorRight[xIndex] - x;
      velocityTargetY = sensorRight[yIndex] - y;
      haveFoundPheromone = true;
    }

    return [haveFoundPheromone, velocityTargetX, velocityTargetY];
  }

  let activePheromones: number[] = [];
  let lastPheromonePickedIndex = 3; // acomodate for sensors that took 0, 1 and 2
  function addPheromone(x: number, y: number, hasFood: boolean, spawnTime: number) {
    const pheromone = bodies[lastPheromonePickedIndex];
    pheromone[xIndex] = x;
    pheromone[yIndex] = y;
    pheromone[spawnTimeIndex] = spawnTime;
    pheromone[tagIndex] = hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST;
    const [id] = pheromone;
    activePheromones.push(id);
    insert(pheromone);

    const pheromoneSprite = Sprite.from(hasFood ? foodPheromoneTexture : nestPheromoneTexture);
    pheromoneSprite.x = x;
    pheromoneSprite.y = y;
    pheromoneSprite.anchor.set(0.5);
    pheromoneSprite.scale.set(0.2 * pheromoneRadius);
    pheromonesSpritesMap.set(id, pheromoneSprite);
    if (hasFood) {
      foodPheromonesSprites.addChild(pheromoneSprite);
    } else nestPheromonesSprites.addChild(pheromoneSprite);

    lastPheromonePickedIndex++;
    if (lastPheromonePickedIndex === maxPheromonesCount) lastPheromonePickedIndex = 3;
  }

  function updatePheromones(frameStartTime: number) {
    let index = 0;
    let { length } = activePheromones;
    for (index; index < length; index++) {
      const pheromone = bodies[index];
      let lifeSpan = (frameStartTime - pheromone[spawnTimeIndex]) / 1000;
      const sprite = pheromonesSpritesMap.get(index)!;
      if (lifeSpan < pheromonesMaxLifeSpan && sprite) {
        sprite.alpha = 1 - lifeSpan / pheromonesMaxLifeSpan;
      } else {
        pheromone[xIndex] = index * -3;
        pheromone[yIndex] = index * -3;
        pheromonesSpritesMap.delete(index);
        if (sprite) {
          if (pheromone[tagIndex] === PHEROMONE_FOOD) foodPheromonesSprites.removeChild(sprite);
          else nestPheromonesSprites.removeChild(sprite);
        }
        activePheromones = activePheromones.splice(index, 1);
        index--;
        length--;
      }
    }
  }

  function drawSensors(context: PIXI.Graphics): void {
    let [, x, y, radius] = sensorLeft;
    context.drawCircle(x, y, radius);
    [, x, y, radius] = sensorForward;
    context.drawCircle(x, y, radius);
    [, x, y, radius] = sensorRight;
    context.drawCircle(x, y, radius);
  }

  return {
    addPheromone,
    bodies,
    drawSensors,
    getPheromonesCount: () => activePheromones.length,
    pheromoneEmissionTimer,
    sensorForward,
    sensorLeft,
    sensorRight,
    sensorsTurnInterpolationSpeed: 10,
    updateAntSensors,
    updatePheromones,
  };
}
