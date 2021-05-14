import * as PIXI from 'pixi.js';

import PheromoneImage from 'assets/pheromone.png';
import { doNTimes } from 'utils/do-n-times';
import { Timer } from './Timer';
import { TAGS } from './collisions/collisions';
import { setupCollisions } from './pheromonesCollisions';

export function setupAntsPheromones(
  antsCount: number,
  antsScale: number,
  stage: PIXI.Container,
): any {
  const { max, round, sqrt } = Math;
  const timeBetweenPheromonesSpawn = 0.066 * antsScale;
  const pheromoneEmissionTimer = new Timer(timeBetweenPheromonesSpawn);
  const pheromonesMaxLifeSpan = 16;
  const maxPheromonesCount =
    antsCount * round(1 / timeBetweenPheromonesSpawn) * pheromonesMaxLifeSpan;
  const { ANT_SENSOR, PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
  const {
    brachIndexes: { AABB_leftIndex, AABB_topIndex, AABB_rightIndex, AABB_bottomIndex },
    pheromoneBodyIndexes: { xIndex, yIndex, radiusIndex, tagIndex, spawnTimeIndex },
    arePheromonesOverlapping,
    bodies,
    branches,
    getPotentials,
    update,
  } = setupCollisions(maxPheromonesCount);

  const { Sprite } = PIXI;
  const pheromonesSprites = new PIXI.ParticleContainer(maxPheromonesCount, {
    alpha: true,
    position: true,
    scale: true,
    tint: true,

    rotation: false,
    uvs: false,
    vertices: false,
  });
  pheromonesSprites.zIndex = 1;
  stage.addChild(pheromonesSprites);
  const pheromoneRadius = 0.7 * antsScale;
  /** Time before pheromone will decay (in seconds) */
  const pheromonesSpritesMap: PIXI.Sprite[] = [];
  const pheromoneImageTexture = PIXI.Texture.from(PheromoneImage);
  /** Create all the sprites in advance. */
  doNTimes((index: number): void => {
    const pheromoneSprite = Sprite.from(pheromoneImageTexture);
    pheromoneSprite.x = -10;
    pheromoneSprite.y = -10;
    pheromoneSprite.anchor.set(0.5);
    pheromoneSprite.scale.set(0.2 * pheromoneRadius);
    pheromonesSpritesMap[index] = pheromoneSprite;
    pheromonesSprites.addChild(pheromoneSprite);
  }, maxPheromonesCount);

  const sensorForwardDistance = 3.6;
  const sensorsSideDistance = 0.46;
  const sensorsSideSpread = 0.7;
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
    sensor[radiusIndex] = pheromoneRadius * 0.6 * antsScale;

    return sensor;
  });

  const [sensorLeft, sensorForward, sensorRight] = sensors;

  function updateAntSensors(
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    hasFood: boolean,
    frameStartTime: number,
  ) {
    const xBase = directionX * antsScale;
    const yBase = directionY * antsScale;
    let tag = hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD;
    sensorForward[xIndex] = x + xBase * sensorForwardDistance;
    sensorForward[yIndex] = y + yBase * sensorForwardDistance;
    sensorLeft[xIndex] =
      x +
      xBase * (sensorForwardDistance * sensorsSideDistance) -
      directionY * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorLeft[yIndex] =
      y +
      yBase * (sensorForwardDistance * sensorsSideDistance) +
      directionX * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorRight[xIndex] =
      x +
      xBase * (sensorForwardDistance * sensorsSideDistance) +
      directionY * (sensorForwardDistance * sensorsSideSpread) * antsScale;
    sensorRight[yIndex] =
      y +
      yBase * (sensorForwardDistance * sensorsSideDistance) -
      directionX * (sensorForwardDistance * sensorsSideSpread) * antsScale;

    sensors.forEach((body: number[]) => {
      const [id, xB, yB, radiusB] = body;
      const branch = branches[id];

      if (
        xB - radiusB < branch[AABB_leftIndex] ||
        yB - radiusB < branch[AABB_topIndex] ||
        xB + radiusB > branch[AABB_rightIndex] ||
        yB + radiusB > branch[AABB_bottomIndex]
      ) {
        update(body);
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
    let directionTargetX = 0;
    let directionTargetY = 0;

    if (frontSensorInputSum > max(leftSensorInputSum, rightSensorInputSum)) {
      directionTargetX = sensorForward[xIndex] - x;
      directionTargetY = sensorForward[yIndex] - y;
      haveFoundPheromone = true;
    } else if (leftSensorInputSum > rightSensorInputSum) {
      directionTargetX = sensorLeft[xIndex] - x;
      directionTargetY = sensorLeft[yIndex] - y;
      haveFoundPheromone = true;
    } else if (rightSensorInputSum > leftSensorInputSum) {
      directionTargetX = sensorRight[xIndex] - x;
      directionTargetY = sensorRight[yIndex] - y;
      haveFoundPheromone = true;
    }

    const length = sqrt(directionTargetX * directionTargetX + directionTargetY * directionTargetY);

    return [haveFoundPheromone, directionTargetX / length, directionTargetY / length];
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
    update(pheromone);

    const pheromoneSprite = pheromonesSpritesMap[id];
    pheromoneSprite.x = x;
    pheromoneSprite.y = y;
    pheromoneSprite.alpha = 1;
    pheromoneSprite.tint = hasFood ? 0x00cc22 : 0x0088ff;

    lastPheromonePickedIndex++;
    if (lastPheromonePickedIndex >= maxPheromonesCount) lastPheromonePickedIndex = 3;
  }

  function updatePheromones(frameStartTime: number) {
    const toBeRemoved: number[] = [];
    activePheromones.forEach((activeId: number): void => {
      const pheromone = bodies[activeId];
      let lifeSpan = (frameStartTime - pheromone[spawnTimeIndex]) / 1000;
      const sprite = pheromonesSpritesMap[activeId];
      if (lifeSpan < pheromonesMaxLifeSpan) {
        sprite.alpha = 1 - lifeSpan / pheromonesMaxLifeSpan;
      } else {
        pheromone[xIndex] = activeId * -3;
        pheromone[yIndex] = activeId * -3;
        if (sprite) {
          sprite.x = -10;
          sprite.y = -10;
        }
        toBeRemoved.push(activeId);
      }
    });
    activePheromones = activePheromones.filter((active: number) => !toBeRemoved.includes(active));
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
