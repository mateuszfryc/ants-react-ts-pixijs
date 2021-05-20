import { Container, DisplayObject, ParticleContainer, Sprite, Texture } from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { Collisions, TAGS } from 'simulation/collisions/collisions';
import * as MATH from 'utils/math';
import { Timer } from 'simulation/Timer';
import { doNTimes } from 'utils/do-n-times';
import { Shape } from './collisions/proxyTypes';
import {
  foodImageTexture,
  foodSprites,
  foodBitesSpritesMap,
  foodCollisionShapes,
  foodProps,
} from './Food';
import { createNest } from './Nest';
import { Pheromones } from './Pheromones';

export function CreateAntsColony(
  antsCount: number,
  stage: Container,
  antsSprites: ParticleContainer,
  foodBitesSprites: ParticleContainer,
  worldWidth: number,
  worldHeight: number,
): any {
  const { min, atan2, cos, sin, abs, sqrt } = Math;
  const antsScale = 3;
  const antsProps: number[][] = [];
  antsProps.length = antsCount;
  /**
   * Desribes how many single pheromones
   * can be emitted before ant
   * will have to visit nest or find food,
   * to start emitting pheromones again.
   */
  const maxPheromonesEmission = 64;
  const antsCollisions = new Collisions();
  const antsCollisionShapes = new Map<number, Circle>();
  const randomDirectionMaxAngle = 1;
  const directionChangeMultiplier = 0.16;

  const antTexture = Texture.from(AntImage);
  const timers = new Map<number, Timer>();

  let lastCreatedAntId = 0;
  const antsSpritesMap = new Map<number, Sprite>();

  const idIndex = 0;
  const directionXIndex = 1;
  const directionYIndex = 2;
  const randomDirectionXIndex = 3;
  const randomDirectionYIndex = 4;
  const speedIndex = 5;
  const speedTargetIndex = 6;
  const maxSpeedIndex = 7;
  const hasFoodIndex = 8;
  const pheromoneStrengthIndex = 9;

  function spawnAnt(id: number, x: number, y: number): any {
    const antCollisionShape = new Circle(
      x,
      y,
      antsScale * 0.85, // radius
      TAGS.ANT,
      1, // scale
      0, // padding
      id,
    );

    const antSprite = Sprite.from(antTexture);
    antSprite.scale.set(antsScale * 0.095);
    antSprite.anchor.set(0.5);
    antSprite.zIndex = 1;
    const rotationChangeTimer = new Timer(undefined, undefined, 0.2, 1);

    // x and y random and normalized velocity
    const [directionX, directionY] = MATH.randomUnitVector();
    const randomDirectionX = 0;
    const randomDirectionY = 0;
    const maxSpeed = MATH.randomInRange(55, 65);
    const speed = maxSpeed * 0.5;
    const targetSpeed = maxSpeed;
    const hasFood = 0;
    const pheromoneStrength = 0;
    const properties = [
      id,
      directionX,
      directionY,
      randomDirectionX,
      randomDirectionY,
      speed,
      targetSpeed,
      maxSpeed,
      hasFood,
      pheromoneStrength,
    ];

    antsCollisionShapes.set(id, antCollisionShape);
    antsCollisions.insert(antCollisionShape as Shape);
    antsSpritesMap.set(id, antSprite);
    antsSprites.addChild(antSprite);
    timers.set(id, rotationChangeTimer);
    antsProps[id] = properties;
    lastCreatedAntId++;

    return antsCollisionShapes.size < antsCount;
  }

  function releaseOneByOne(xSpawn: number, ySpawn: number): void {
    setTimeout(() => {
      const shouldSpawnNextAnt = spawnAnt(
        lastCreatedAntId,
        xSpawn + MATH.randomInRange(-10, 10),
        ySpawn + MATH.randomInRange(-10, 10),
      );
      if (shouldSpawnNextAnt) {
        releaseOneByOne(xSpawn, ySpawn);
      }
    }, 0);
  }

  const throwAllAtOnce = (): void => {
    doNTimes(() => {
      spawnAnt(
        lastCreatedAntId,
        MATH.randomInRange(10, worldWidth - 10),
        MATH.randomInRange(10, worldHeight - 10),
      );
    }, antsCount);
  };

  const pheromones = new Pheromones(antsCount, antsScale, 0.066 * antsScale);
  stage.addChild((pheromones.sprites as unknown) as DisplayObject);

  const pheromonesSteeringSensitivity = 0.1;
  const { ANT, FOOD, NEST, PHEROMONE_FOOD, PHEROMONE_NEST, NEST_VISIBLE_AREA } = TAGS;
  const collisionTestResult: number[] = [];
  const nest = createNest(worldWidth * 0.5, worldHeight * 0.5, stage, antsCollisions);
  antsCollisions.createWorldBounds(worldWidth, worldHeight, 200, -199);

  function update(deltaSeconds: number, frameStartTime: number): void {
    let antsOnScreenCounter = 0;
    const shouldSpawnPheromones = pheromones.pheromoneEmissionTimer.update(deltaSeconds);

    antsCollisionShapes.forEach((ant: Circle) => {
      const { id } = ant;
      const props = antsProps[id];
      const speed = props[speedIndex];
      ant.x += speed * props[directionXIndex] * deltaSeconds;
      ant.y += speed * props[directionYIndex] * deltaSeconds;
    });

    antsCollisions.update();

    antsProps.forEach((ant: number[]) => {
      let [
        id,
        directionX,
        directionY,
        randomDirectionX,
        randomDirectionY,
        speed,
        speedTarget,
        maxSpeed,
        hasFood,
        pheromoneStrength,
      ] = ant;
      const antBody = antsCollisionShapes.get(id)!;
      let directionTargetX = directionX;
      let directionTargetY = directionY;
      let speedInterpolationSpeed = 1;
      let isStandingOnPheromone = false;
      let makeRandomTurn = true;

      for (const other of antsCollisions.getPotentials(antBody as Shape)) {
        if (antsCollisions.areBodiesColliding(antBody as Shape, other, collisionTestResult)) {
          let [overlap, overlapX, overlapY] = collisionTestResult;
          const { id: otherId, tag, radius } = other;

          /* eslint-disable indent */
          switch (tag) {
            case ANT:
              if (!hasFood) {
                overlap *= 0.5;
                antBody.x -= overlap * overlapX;
                antBody.y -= overlap * overlapY;
                other.x -= overlap * overlapX;
                other.y -= overlap * overlapY;
                makeRandomTurn = false;
              }
              break;

            case NEST:
              if (hasFood) {
                hasFood = 0;
                const foodChunkToBeRemoved = foodBitesSpritesMap.get(id);
                if (foodChunkToBeRemoved) {
                  foodBitesSprites.removeChild(foodChunkToBeRemoved);
                  foodBitesSpritesMap.delete(id);
                }
                makeRandomTurn = false;
                speed = 0;
                directionTargetX = -directionX;
                directionTargetY = -directionY;
              } else {
                pheromoneStrength = maxPheromonesEmission;
              }
              break;

            case NEST_VISIBLE_AREA:
              if (hasFood) {
                directionTargetX = other.x - antBody.x;
                directionTargetY = other.y - antBody.y;
                makeRandomTurn = false;
              }
              break;

            case PHEROMONE_FOOD:
              isStandingOnPheromone = true;
              break;

            case PHEROMONE_NEST:
              isStandingOnPheromone = true;
              break;

            case FOOD:
              const halfRadius = other.radius * 0.5;
              if (overlap < halfRadius) {
                if (!hasFood) {
                  directionTargetX = overlapX;
                  directionTargetY = overlapY;
                  makeRandomTurn = false;
                }
              } else {
                overlap -= halfRadius;
                antBody.x -= overlap * overlapX;
                antBody.y -= overlap * overlapY;
                let [amount, isEmpty] = foodProps.get(otherId)!;
                if (!hasFood && !isEmpty) {
                  directionTargetX = -directionX;
                  directionTargetY = -directionY;
                  makeRandomTurn = false;
                  speed = 0;
                  const foodSprite = foodSprites.get(otherId);
                  if (foodSprite) {
                    const {
                      scale,
                      scale: { x },
                    } = foodSprite;
                    const newSize = x - MATH.mapRangeClamped(1, 0, amount, 0, x);
                    scale.set(newSize);
                    other.radius = (newSize * radius) / x;
                  }
                  hasFood = 1;
                  const foodChunkSprite = Sprite.from(foodImageTexture);
                  foodChunkSprite.scale.set(0.2);
                  foodChunkSprite.anchor.set(0.5, -0.8);
                  foodChunkSprite.zIndex = 3;
                  foodBitesSprites.addChild(foodChunkSprite);
                  foodBitesSpritesMap.set(id, foodChunkSprite);
                  amount--;
                  isEmpty = amount <= 0 ? 1 : 0;
                  if (isEmpty) {
                    stage.removeChild(foodSprite!);
                    foodProps.delete(otherId);
                    foodSprites.delete(otherId);
                    foodCollisionShapes.delete(otherId);
                  }
                  foodProps.set(otherId, [amount, isEmpty]);
                  pheromoneStrength = maxPheromonesEmission;
                }
              }

              break;

            default:
              antBody.x -= overlap * overlapX;
              antBody.y -= overlap * overlapY;
              speed = 0;
              makeRandomTurn = false;
              /** By default move along reflection vector */
              directionTargetX = directionX - 2 * (directionX * -overlapX) * -overlapX;
              directionTargetY = directionY - 2 * (directionY * -overlapY) * -overlapY;

              break;
          }
          /* eslint-enable indent */
        }
      }

      const { x, y } = antBody;

      const rotationChangeTImer = timers.get(id);
      if (rotationChangeTImer!.update(deltaSeconds)) {
        const angle =
          atan2(directionY, directionX) +
          MATH.randomInRange(0, randomDirectionMaxAngle) * MATH.randomSign();
        randomDirectionX = cos(angle);
        randomDirectionY = sin(angle);
      }

      if (makeRandomTurn) {
        const xABS = abs(randomDirectionX);
        if (xABS > 0) {
          const partOfComponent = randomDirectionX * directionChangeMultiplier * (1 / xABS);
          directionTargetX += partOfComponent;
          randomDirectionX -= partOfComponent;
        }

        const yABS = abs(randomDirectionY);
        if (yABS > 0) {
          const partOfComponent = randomDirectionY * directionChangeMultiplier * (1 / yABS);
          directionTargetY += partOfComponent;
          randomDirectionY -= partOfComponent;
        }
      }

      const [pheromoneSteerForceX, pheromoneSteerForceY] = pheromones.getDirectionFromSensors(
        x,
        y,
        directionX,
        directionY,
        antsScale,
        hasFood > 0,
        frameStartTime,
      );

      /**
       * pheromonesSteeringSensitivity
       * helps here to make movement towards
       * pheromones more fluent. The higher this number
       * the more sudden turns towards pheromones are.
       */
      directionTargetX += pheromoneSteerForceX * pheromonesSteeringSensitivity;
      directionTargetY += pheromoneSteerForceY * pheromonesSteeringSensitivity;

      /**
       * In this setup radian angle = PI points up,
       * the 0 (zero) pints down, halfPI points right
       * and -halfPI points left.
       */
      if (directionTargetX !== directionX || directionY !== directionTargetY) {
        directionX = directionTargetX;
        directionY = directionTargetY;
        const length = sqrt(directionX * directionX + directionY * directionY);
        directionX /= length;
        directionY /= length;
      }

      antBody.xv = directionX;
      antBody.yv = directionY;

      speed = MATH.interpolate(speed, speedTarget, deltaSeconds, speedInterpolationSpeed);

      const antSprite = antsSpritesMap.get(id)!;
      antSprite.x = x;
      antSprite.y = y;
      const turnAngle = atan2(directionX, directionY);
      antSprite.rotation = -turnAngle;

      /** Drag the food sprite along */
      if (hasFood) {
        const foodChunkSprite = foodBitesSpritesMap.get(id);
        if (foodChunkSprite) {
          foodChunkSprite.x = x;
          foodChunkSprite.y = y;
          foodChunkSprite.rotation = antSprite.rotation;
        }
      }

      if (pheromoneStrength > 0 && shouldSpawnPheromones && !isStandingOnPheromone) {
        pheromones.addPheromone(x, y, hasFood > 0, frameStartTime);
        pheromoneStrength--;
      }

      if (x > 0 && y > 0 && x < worldWidth && y < worldHeight) antsOnScreenCounter++;

      ant[idIndex] = id;
      ant[directionXIndex] = directionX;
      ant[directionYIndex] = directionY;
      ant[randomDirectionXIndex] = randomDirectionX;
      ant[randomDirectionYIndex] = randomDirectionY;
      ant[speedIndex] = speed;
      ant[speedTargetIndex] = speedTarget;
      ant[hasFoodIndex] = hasFood;
      ant[pheromoneStrengthIndex] = pheromoneStrength;
    });

    pheromones.updatePheromones(frameStartTime);
  }

  return {
    antsCollisions,
    antsCollisionShapes,
    antsProps,
    antsScale,
    antsSpritesMap,
    getPheromonesCount: () => pheromones.getPheromonesCount(),
    maxPheromonesEmission,
    nest,
    releaseOneByOne,
    throwAllAtOnce,
    timers,
    update,
  };
}
