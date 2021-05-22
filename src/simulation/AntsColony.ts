import { Container, DisplayObject, ParticleContainer, Sprite, Texture } from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { Collisions, TAGS } from 'simulation/collisions/collisions';
import * as MATH from 'utils/math';
import { Timer } from 'simulation/Timer';
import { doNTimes } from 'utils/do-n-times';
import { Shape } from './collisions/proxyTypes';
import {
  foodSprites,
  foodBitesSpritesMap,
  foodCollisionShapes,
  foodProps,
  foodImageTexture,
} from './Food';
import { Pheromones } from './Pheromones';

export class TheAntColony {
  antsProps: number[][] = [];
  antsCollisionShapes = new Map<number, Circle>();
  antsSpritesMap = new Map<number, Sprite>();
  antTexture = Texture.from(AntImage);
  collisions = new Collisions();
  timers = new Map<number, Timer>();
  pheromonesSteeringSensitivity = 0.1;
  directionChangeMultiplier = 0.16;
  randomDirectionMaxAngle = 1;
  maxPheromonesEmission = 64;
  lastCreatedAntId = 0;
  antsScale = 3;
  tags = TAGS;
  indexes = {
    idIndex: 0,
    directionXIndex: 1,
    directionYIndex: 2,
    randomDirectionXIndex: 3,
    randomDirectionYIndex: 4,
    speedIndex: 5,
    speedTargetIndex: 6,
    maxSpeedIndex: 7,
    hasFoodIndex: 8,
    pheromoneStrengthIndex: 9,
  };

  antsCount: number;
  antsSprites: ParticleContainer;
  foodBitesSprites: ParticleContainer;
  pheromones: Pheromones;

  constructor(
    antsCount: number,
    stage: Container,
    antsSprites: ParticleContainer,
    foodBitesSprites: ParticleContainer,
    worldWidth: number,
    worldHeight: number,
    pheromonesMaxLifeSpan: number,
  ) {
    this.antsCount = antsCount;
    this.antsProps.length = antsCount;
    this.antsSprites = antsSprites;
    this.foodBitesSprites = foodBitesSprites;
    this.pheromones = new Pheromones(
      antsCount,
      this.antsScale,
      Math.max(worldWidth, worldHeight) + 1,
      pheromonesMaxLifeSpan,
    );

    stage.addChild((this.pheromones.sprites as unknown) as DisplayObject);
    this.collisions.createWorldBounds(worldWidth, worldHeight, 200, -199);
  }

  private spawnAnt(id: number, x: number, y: number): boolean {
    const { antsScale, antTexture } = this;
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

    this.antsCollisionShapes.set(id, antCollisionShape);
    this.collisions.insert(antCollisionShape as Shape);
    this.antsSpritesMap.set(id, antSprite);
    this.antsSprites.addChild(antSprite);
    this.timers.set(id, rotationChangeTimer);
    this.antsProps[id] = properties;
    this.lastCreatedAntId++;

    return this.antsCollisionShapes.size < this.antsCount;
  }

  public releaseOneByOne(xSpawn: number, ySpawn: number): void {
    setTimeout(() => {
      const shouldSpawnNextAnt = this.spawnAnt(
        this.lastCreatedAntId,
        xSpawn + MATH.randomInRange(-10, 10),
        ySpawn + MATH.randomInRange(-10, 10),
      );
      if (shouldSpawnNextAnt) {
        this.releaseOneByOne(xSpawn, ySpawn);
      }
    }, 0);
  }

  public throwAllAtOnce(worldWidth: number, worldHeight: number): void {
    doNTimes(() => {
      this.spawnAnt(
        this.lastCreatedAntId,
        MATH.randomInRange(10, worldWidth - 10),
        MATH.randomInRange(10, worldHeight - 10),
      );
    }, this.antsCount);
  }

  public update(
    deltaSeconds: number,
    frameStartTime: number,
    stage: Container,
    worldWidth: number,
    worldHeight: number,
  ): number {
    const {
      pheromones,
      antsProps,
      indexes: {
        idIndex,
        directionXIndex,
        directionYIndex,
        randomDirectionXIndex,
        randomDirectionYIndex,
        speedIndex,
        speedTargetIndex,
        hasFoodIndex,
        pheromoneStrengthIndex,
      },
      antsCollisionShapes,
      collisions,
      foodBitesSprites,
      maxPheromonesEmission,
      tags: { ANT, FOOD, NEST, PHEROMONE_FOOD, PHEROMONE_NEST, NEST_VISIBLE_AREA },
    } = this;
    let antsOnScreenCounter = 0;
    const shouldSpawnPheromones = pheromones.pheromoneEmissionTimer.update(deltaSeconds);
    const collisionTestResult: number[] = [];

    antsCollisionShapes.forEach((ant: Circle) => {
      const { id } = ant;
      const props = antsProps[id];
      const speed = props[speedIndex];
      ant.x += speed * props[directionXIndex] * deltaSeconds;
      ant.y += speed * props[directionYIndex] * deltaSeconds;
    });

    collisions.update();

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
      let makeRandomTurn = true;

      for (const other of collisions.getPotentials(antBody as Shape)) {
        if (collisions.areBodiesColliding(antBody as Shape, other, collisionTestResult)) {
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
              break;

            case PHEROMONE_NEST:
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

      const rotationChangeTImer = this.timers.get(id);
      if (rotationChangeTImer!.update(deltaSeconds)) {
        const angle =
          Math.atan2(directionY, directionX) +
          MATH.randomInRange(0, this.randomDirectionMaxAngle) * MATH.randomSign();
        randomDirectionX = Math.cos(angle);
        randomDirectionY = Math.sin(angle);
      }

      if (makeRandomTurn) {
        const xABS = Math.abs(randomDirectionX);
        if (xABS > 0) {
          const partOfComponent = randomDirectionX * this.directionChangeMultiplier * (1 / xABS);
          directionTargetX += partOfComponent;
          randomDirectionX -= partOfComponent;
        }

        const yABS = Math.abs(randomDirectionY);
        if (yABS > 0) {
          const partOfComponent = randomDirectionY * this.directionChangeMultiplier * (1 / yABS);
          directionTargetY += partOfComponent;
          randomDirectionY -= partOfComponent;
        }
      }

      const [pheromoneSteerForceX, pheromoneSteerForceY] = pheromones.getDirectionFromSensors(
        x,
        y,
        directionX,
        directionY,
        this.antsScale,
        hasFood > 0,
        frameStartTime,
      );

      /**
       * pheromonesSteeringSensitivity
       * helps here to make movement towards
       * pheromones more fluent. The higher this number
       * the more sudden turns towards pheromones are.
       */
      directionTargetX += pheromoneSteerForceX * this.pheromonesSteeringSensitivity;
      directionTargetY += pheromoneSteerForceY * this.pheromonesSteeringSensitivity;

      /**
       * In this setup radian angle = PI points up,
       * the 0 (zero) pints down, halfPI points right
       * and -halfPI points left.
       */
      if (directionTargetX !== directionX || directionY !== directionTargetY) {
        directionX = directionTargetX;
        directionY = directionTargetY;
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        directionX /= length;
        directionY /= length;
      }

      antBody.xv = directionX;
      antBody.yv = directionY;

      speed = MATH.interpolate(speed, speedTarget, deltaSeconds, speedInterpolationSpeed);

      const antSprite = this.antsSpritesMap.get(id)!;
      antSprite.x = x;
      antSprite.y = y;
      const turnAngle = Math.atan2(directionX, directionY);
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

      if (pheromoneStrength > 0 && shouldSpawnPheromones) {
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

    return antsOnScreenCounter;
  }

  getPheromonesCount(): number {
    return this.pheromones.getPheromonesCount();
  }
}
