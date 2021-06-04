import { Container, ParticleContainer, Sprite, Texture } from 'pixi.js';

import AntImage from 'assets/ant-red.png';
import { Circle } from 'simulation/collisions/circle';
import { Collisions, TAGS } from 'simulation/collisions/collisions';
import * as MATH from 'shared/math';
import { Timer } from 'simulation/Timer';
import { doNTimes } from 'shared/do-n-times';
import { Shape } from './collisions/proxyTypes';
import { Food } from './Food';
import { Pheromones } from './Pheromones';
import { SimulationSettings } from './types';
import { Nest } from './Nest';

export class TheAntColony {
  antsProps: number[][] = [];
  antsCollisionShapes = new Map<number, Circle>();
  antsSpritesMap = new Map<number, Sprite>();
  antTexture = Texture.from(AntImage);
  timers = new Map<number, Timer>();
  pheromonesSteeringSensitivity = 1;
  directionChangeMultiplier = 0.16;
  randomDirectionMaxAngle = 1;
  maxPheromoneFuel = 128;
  lastCreatedAntId = 0;
  maxSpeed = MATH.randomInRange(55, 65);
  tags = TAGS;
  indexes = {
    idIndex: 0,
    directionXIndex: 1,
    directionYIndex: 2,
    randomDirectionXIndex: 3,
    randomDirectionYIndex: 4,
    speedIndex: 5,
    speedTargetIndex: 6,
    payloadIdIndex: 7,
    hasFoodIndex: 8,
    pheromoneStrengthIndex: 9,
  };

  nest: Nest;
  antsScale: number;
  antsCount: number;
  antsSprites: ParticleContainer;
  collisions: Collisions;

  constructor(settings: SimulationSettings, collisions: Collisions) {
    const { antsCount } = settings;
    this.nest = new Nest(settings.nestPositon.x, settings.nestPositon.y);
    this.antsCount = antsCount;
    this.antsScale = settings.antsScale;
    this.antsProps.length = antsCount;
    this.collisions = collisions;

    this.antsSprites = new ParticleContainer(this.antsCount, {
      position: true,
      scale: true,
      tint: true,
      rotation: true,

      alpha: false,
      uvs: false,
      vertices: false,
    });
    this.antsSprites.zIndex = 3;
  }

  public getAntsCollisionShapes(): Shape[] {
    const shapes: Shape[] = [];
    this.antsCollisionShapes.forEach((shape: Circle) => {
      shapes.push(shape as Shape);
    });

    return shapes;
  }

  private spawnAnt(x: number, y: number): boolean {
    const id = this.lastCreatedAntId;
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
    const payloadId = -1;
    const speed = this.maxSpeed * Math.random();
    const targetSpeed = this.maxSpeed;
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
      payloadId,
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

  public releaseOneByOne(xSpawn = this.nest.x, ySpawn = this.nest.y): void {
    setTimeout(() => {
      const shouldSpawnNextAnt = this.spawnAnt(
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
        MATH.randomInRange(10, worldWidth - 10),
        MATH.randomInRange(10, worldHeight - 10),
      );
    }, this.antsCount);
  }

  public update(
    deltaSeconds: number,
    pheromones: Pheromones,
    food: Food,
    worldWidth: number,
    worldHeight: number,
  ): number {
    const {
      antsProps,
      indexes: {
        idIndex,
        directionXIndex,
        directionYIndex,
        randomDirectionXIndex,
        randomDirectionYIndex,
        speedIndex,
        speedTargetIndex,
        payloadIdIndex,
        hasFoodIndex,
        pheromoneStrengthIndex,
      },
      antsCollisionShapes,
      maxPheromoneFuel,
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

    this.collisions.update();

    antsProps.forEach((ant: number[]) => {
      let [
        id,
        directionX,
        directionY,
        randomDirectionX,
        randomDirectionY,
        speed,
        speedTarget,
        payloadId,
        hasFood,
        pheromoneFuel,
      ] = ant;
      const antBody = antsCollisionShapes.get(id)!;
      let directionTargetX = directionX;
      let directionTargetY = directionY;
      let speedInterpolationSpeed = 1;
      let searchForPheromones = true;
      let makeRandomTurn = true;

      for (const other of this.collisions.getPotentials(antBody as Shape)) {
        if (this.collisions.areBodiesColliding(antBody as Shape, other, collisionTestResult)) {
          let [overlap, overlapX, overlapY] = collisionTestResult;
          const { id: otherId, tag } = other;

          /* eslint-disable indent */
          switch (tag) {
            case ANT:
              if (!hasFood && !other[hasFoodIndex]) {
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
                food.remove(id);
                makeRandomTurn = false;
                speed = 0;
                directionTargetX = -directionX;
                directionTargetY = -directionY;
              } else {
                pheromoneFuel = maxPheromoneFuel;
              }
              break;

            case NEST_VISIBLE_AREA:
              if (hasFood) {
                directionTargetX = other.x - antBody.x;
                directionTargetY = other.y - antBody.y;
                makeRandomTurn = false;
                searchForPheromones = false;
              }
              break;

            case PHEROMONE_FOOD:
              break;

            case PHEROMONE_NEST:
              break;

            case FOOD:
              const halfRadius = other.radius * 0.85;
              if (overlap < halfRadius) {
                if (!hasFood) {
                  directionTargetX = overlapX;
                  directionTargetY = overlapY;
                  makeRandomTurn = false;
                  searchForPheromones = false;
                }
              } else {
                overlap -= halfRadius;
                antBody.x -= overlap * overlapX;
                antBody.y -= overlap * overlapY;
                if (!hasFood) {
                  /** In general ants remambre overal direction back to the nest. */
                  directionTargetX = this.nest.x - antBody.x;
                  directionTargetY = this.nest.y - antBody.y;
                  makeRandomTurn = false;
                  speed = 0;
                  hasFood = 1;
                  food.pickUpCrumb(otherId);
                  payloadId = otherId;
                  pheromoneFuel = maxPheromoneFuel;
                }
              }

              break;

            default:
              antBody.x -= overlap * overlapX;
              antBody.y -= overlap * overlapY;
              speed = 0;
              makeRandomTurn = false;
              searchForPheromones = false;
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

      if (searchForPheromones) {
        const [pheromoneSteerForceX, pheromoneSteerForceY] = pheromones.getDirectionFromSensor(
          x,
          y,
          directionX,
          directionY,
          hasFood > 0,
        );

        /**
         * pheromonesSteeringSensitivity
         * helps here to make movement towards
         * pheromones more fluent. The higher this number
         * the more sudden turns towards pheromones are.
         */
        directionTargetX += pheromoneSteerForceX * this.pheromonesSteeringSensitivity;
        directionTargetY += pheromoneSteerForceY * this.pheromonesSteeringSensitivity;
      }

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
        const foodCrumb = food.sprites.get(payloadId);
        if (foodCrumb) {
          foodCrumb.x = x;
          foodCrumb.y = y;
          foodCrumb.rotation = antSprite.rotation;
        }
      }

      if (shouldSpawnPheromones && pheromoneFuel > 0) {
        pheromones.placePheromone(x, y, hasFood > 0, pheromoneFuel / maxPheromoneFuel);
        pheromoneFuel--;
      }

      if (x > 0 && y > 0 && x < worldWidth && y < worldHeight) antsOnScreenCounter++;

      ant[idIndex] = id;
      ant[directionXIndex] = directionX;
      ant[directionYIndex] = directionY;
      ant[randomDirectionXIndex] = randomDirectionX;
      ant[randomDirectionYIndex] = randomDirectionY;
      ant[speedIndex] = speed;
      ant[speedTargetIndex] = speedTarget;
      ant[payloadIdIndex] = payloadId;
      ant[hasFoodIndex] = hasFood;
      ant[pheromoneStrengthIndex] = pheromoneFuel;
    });

    return antsOnScreenCounter;
  }
}
