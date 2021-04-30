import * as PIXI from 'pixi.js';

import { Collisions, TAGS } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { Result } from 'simulation/collisions/result';
import { setupAntCounter, setupFPSDisplay } from 'simulation/debug';
import {
  halfPI,
  interpolate,
  mapRange,
  mapRangeClamped,
  normalizeRadians,
  PI,
  randomInRange,
} from 'utils/math';
import NestScentImage from 'assets/nest-scent.png';
import FoodScentImage from 'assets/food-scent.png';
import { getMousePositionFromEvent } from 'utils/input';
import { Circle } from './collisions/circle';
import { Timer } from './Timer';
import {
  releaseTheAntsOneByOne,
  antPropsInt8Count,
  antPropsFloat16Count,
  antsPropsInt8IDs,
  antsPropsFloat16IDs,
  throwAllAntsAtOnce,
  maxPheromonesEmission,
  feromonesLifetime,
} from './Ant';
import { makeSomeFood, foodImageTexture } from './Food';
import { Nest } from './Nest';

const { random, min, atan2, cos, sin, abs, sign, round, sqrt, max } = Math;
const { Sprite } = PIXI;

export const setupSimulation = (
  graphicsEngine: PIXI.Application,
  _container: HTMLElement,
  _draw: PIXI.Graphics,
): void => {
  const { stage: graphics } = graphicsEngine;
  const result = new Result();
  const antsCollisions = new Collisions();
  const pheromonesCollisions = new Collisions();
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = _container;
  // const worldWidth = 200;
  // const worldHeight = 200;
  const worldBounds = antsCollisions.createWorldBounds(worldWidth, worldHeight, 200, -199);
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  // eslint-disable-next-line prettier/prettier
  const {
    speedId,
    targetSpeedId,
    maxSpeedId,
    rotationDirectionId,
    hasFoodId,
    pheromoneStrengthId,
  } = antsPropsInt8IDs;
  // eslint-disable-next-line prettier/prettier
  const { xvId, yvId, xvTargetId, yvTargetId } = antsPropsFloat16IDs;
  const { ANT, FOOD, NEST, PHEROMONE_FOOD, PHEROMONE_NEST, ANT_SENSOR } = TAGS;
  let antsOnScreenCounter = 0;

  const antsCount = 200;
  const antsScale = 3;
  const antsCollisionShapes = new Map<number, Circle>();
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
  const sensorScale = 1;
  const sensorLeft = pheromonesCollisions.addCircle(0, 0, antsScale * sensorScale, ANT_SENSOR);
  const sensorCenter = pheromonesCollisions.addCircle(0, 0, antsScale * sensorScale, ANT_SENSOR);
  const sensorRight = pheromonesCollisions.addCircle(0, 0, antsScale * sensorScale, ANT_SENSOR);
  /**
   * * One (1) dimensional array of properties of all the ants.
   * Accessing single ant prop is done by:
   *   antsProps[i * e + p]
   * where:
   * i = index of the ant
   * e = number of properites single ant has
   * p = index of single prop within range of ant props, starts with 0 and goes up to e - 1
   *
   * the array will look like this:
   * antsProps = [x1, y1, speed1, x2, y2, speed2, x3, y3, speed3...xn, yn, speedn]
   */
  const Int8ArrayItemSize = 1;
  const Int16ArrayItemSize = 2;
  const Float32ArrayItemSize = 4;

  const antsPropsInt8: Int8Array = new Int8Array(
    new ArrayBuffer(antsCount * Int8ArrayItemSize * antPropsInt8Count),
  );
  const antsPropsFloat16: Float32Array = new Float32Array(
    new ArrayBuffer(antsCount * Float32ArrayItemSize * antPropsFloat16Count),
  );
  const antsSprites = new Map<number, PIXI.Sprite>();
  const foodSprites = new Map<number, PIXI.Sprite>();

  const foodBeingCarriedSprites = new Map<number, PIXI.Sprite>();
  const foodCollisionShapes = new Map<number, Circle>();
  const foodProps = new Map<number, number[]>();
  const timers = new Map<number, Timer>();

  const nest = new Nest(worldWidth * 0.5, worldHeight * 0.5);
  graphics.addChild(nest);
  graphics.addChild(nest.entranceCoverSprite);
  antsCollisions.insert(nest.body);

  /** One dimensional array of all ants pheromones */
  const pheremonesCollisionShapes = new Map<number, Circle>();
  const pheromonesSprites = new Map<number, PIXI.Sprite>();
  const pheromoneCollisionShapeRadius = 2;
  /**
   * Individual life time counter for all pheromones
   * in all pheromones types.
   *
   * @pheromonesPerAntMulitplier is an arbitrary number that alows to scale
   * how many active pheromones per ant can be on the map. If the ant
   * wants to spawn new pheromone but used all avilable indexes
   * it will overwritte the oldest (lowest index).
   */
  const pheromonesCountMultiplier = 128;
  let lastPheromoneId = 0;
  const pheromonesLifeTimers = new Uint16Array(
    new ArrayBuffer(antsCount * Int16ArrayItemSize * pheromonesCountMultiplier),
  );
  const maxPheromonesAllowed = pheromonesLifeTimers.length;
  /** 1000 = 1 second, these work as default life time of pheromons of each type */
  pheromonesLifeTimers.fill(feromonesLifetime);
  let pheromonesEmmisionCounter = 0;
  const timeBetweenPhereomonesEmission = 0.2;
  const nestPheromoneTexture = PIXI.Texture.from(NestScentImage);
  const foodPheromoneTexture = PIXI.Texture.from(FoodScentImage);

  const debugTimer = new Timer(0.5);
  let lastTime = performance.now();
  let isTabFocused = true;
  window.addEventListener('blur', () => {
    isTabFocused = false;
  });
  window.addEventListener('focus', () => {
    isTabFocused = true;
    lastTime = performance.now();
  });

  /**
   * Variables used for ants update loop.
   * Forward declaration allows to save time otherwise used
   * to declare them on each step of the loop.
   */
  let frameStartTime = 0;
  let deltaTimeMILISeconds = 0;
  let deltaTimeSeconds = 0;
  let propInt8Id = 0;
  let propFloat16Id = 0;
  let centerSensorInputSum = 0;
  let leftSensorInputSum = 0;
  let rightSensorInputSum = 0;
  let speed = 0;
  let speedTarget = 0;
  let maxSpeed = 0;
  let rotationDirectionSign = 0;
  let hasFood = 0;
  let nestPheromoneStrength = 0;
  let xVelocity = 0;
  let yVelocity = 0;
  let xvTarget = 0;
  let yvTarget = 0;
  let speedInterpolationSpeed = 0;
  let velocityInterpolationSpeed = 0;
  let collisionsCount = 0;
  let turnAngle = 0;
  let length = 0;
  let skipRandomDirectionChange = false;

  function simulationUpdate() {
    if (!isTabFocused) return;
    frameStartTime = performance.now();
    deltaTimeMILISeconds = round(frameStartTime - lastTime);
    deltaTimeSeconds = min(deltaTimeMILISeconds / 1000, 0.5);
    antsOnScreenCounter = 0;
    pheromonesEmmisionCounter += deltaTimeSeconds;

    antsCollisionShapes.forEach((ant) => {
      const { id } = ant;
      propFloat16Id = id * antPropsFloat16Count;
      speed = antsPropsInt8[id * antPropsInt8Count + speedId];
      ant.x += speed * antsPropsFloat16[propFloat16Id + xvId] * deltaTimeSeconds;
      ant.y += speed * antsPropsFloat16[propFloat16Id + yvId] * deltaTimeSeconds;
    });

    antsCollisions.update();

    antsCollisionShapes.forEach((ant) => {
      let { id } = ant;
      propInt8Id = id * antPropsInt8Count;
      propFloat16Id = id * antPropsFloat16Count;

      speed = antsPropsInt8[propInt8Id + speedId];
      speedTarget = antsPropsInt8[propInt8Id + targetSpeedId];
      maxSpeed = antsPropsInt8[propInt8Id + maxSpeedId];
      rotationDirectionSign = antsPropsInt8[propInt8Id + rotationDirectionId];
      hasFood = antsPropsInt8[propInt8Id + hasFoodId];
      nestPheromoneStrength = antsPropsInt8[propInt8Id + pheromoneStrengthId];

      xVelocity = antsPropsFloat16[propFloat16Id + xvId];
      yVelocity = antsPropsFloat16[propFloat16Id + yvId];
      xvTarget = antsPropsFloat16[propFloat16Id + xvTargetId];
      yvTarget = antsPropsFloat16[propFloat16Id + yvTargetId];

      speedInterpolationSpeed = 2;
      velocityInterpolationSpeed = 1;
      collisionsCount = 0;
      turnAngle = 0;

      skipRandomDirectionChange = false;

      for (const other of antsCollisions.getPotentials(ant as Shape)) {
        if (antsCollisions.isCollision(ant as Shape, other, result)) {
          const { overlap, overlap_x, overlap_y } = result;
          const { id: otherId, tag, radius } = other;

          /* eslint-disable indent */
          switch (tag) {
            case ANT:
              collisionsCount++;
              if (!hasFood) {
                ant.x -= overlap! * overlap_x;
                ant.y -= overlap! * overlap_y;
                skipRandomDirectionChange = true;
              }
              break;

            case NEST:
              if (hasFood) {
                hasFood = 0;
                const foodChunkToBeRemoved = foodBeingCarriedSprites.get(id);
                if (foodChunkToBeRemoved) {
                  graphics.removeChild(foodChunkToBeRemoved);
                  foodBeingCarriedSprites.delete(id);
                }
              } else {
                nestPheromoneStrength = maxPheromonesEmission;
              }
              break;

            default:
              collisionsCount++;
              ant.x -= overlap! * overlap_x;
              ant.y -= overlap! * overlap_y;
              if (tag === FOOD) {
                let [amount, isEmpty] = foodProps.get(otherId)!;
                if (!hasFood && !isEmpty) {
                  const foodSprite = foodSprites.get(otherId);
                  if (foodSprite) {
                    const {
                      scale,
                      scale: { x },
                    } = foodSprite;
                    const newSize = x - mapRangeClamped(1, 0, amount, 0, x);
                    scale.set(newSize);
                    other.radius = (newSize * radius) / x;
                  }
                  hasFood = 1;
                  const foodChunkSprite = Sprite.from(foodImageTexture);
                  foodChunkSprite.scale.set(0.2);
                  foodChunkSprite.anchor.set(0.5, -0.8);
                  foodChunkSprite.zIndex = 3;
                  graphics.addChild(foodChunkSprite);
                  foodBeingCarriedSprites.set(id, foodChunkSprite);
                  amount--;
                  isEmpty = amount <= 0 ? 1 : 0;
                  if (isEmpty) {
                    foodProps.delete(otherId);
                    foodSprites.delete(otherId);
                    foodCollisionShapes.delete(otherId);
                  }
                  foodProps.set(otherId, [amount, isEmpty]);
                }
              }
              skipRandomDirectionChange = true;
              velocityInterpolationSpeed = 10;
              turnAngle =
                randomInRange(0.5, 1) *
                  sign(overlap_y > 0 ? 1 : -1) *
                  atan2(-overlap_x, -overlap_y) +
                atan2(xvTarget, yvTarget);
              break;
          }
          /* eslint-enable indent */
        }
      }

      const { x, y } = ant;

      /** Sum up pheromones values for each sensor and select direction */
      centerSensorInputSum = 0;
      leftSensorInputSum = 0;
      rightSensorInputSum = 0;
      const xBase = xVelocity * antsScale;
      const yBase = yVelocity * antsScale;
      sensorCenter.x = x + xBase * 2.8;
      sensorCenter.y = y + yBase * 2.8;
      sensorLeft.x = x + xBase * 1.8 - yVelocity * 1.5 * antsScale;
      sensorLeft.y = y + yBase * 1.8 + xVelocity * 1.5 * antsScale;
      sensorRight.x = x + xBase * 1.8 + yVelocity * 1.5 * antsScale;
      sensorRight.y = y + yBase * 1.8 - xVelocity * 1.5 * antsScale;

      pheromonesCollisions.update();

      for (const other of pheromonesCollisions.getPotentials(sensorCenter as Shape)) {
        if (pheromonesCollisions.isCollision(sensorCenter as Shape, other, result)) {
          const { id: otherId, tag } = other;
          if (tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD))
            centerSensorInputSum += pheromonesLifeTimers[otherId];
        }
      }

      for (const other of pheromonesCollisions.getPotentials(sensorLeft as Shape)) {
        if (pheromonesCollisions.isCollision(sensorLeft as Shape, other, result)) {
          const { id: otherId, tag } = other;
          if (tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD))
            leftSensorInputSum += pheromonesLifeTimers[otherId];
        }
      }

      for (const other of pheromonesCollisions.getPotentials(sensorRight as Shape)) {
        if (pheromonesCollisions.isCollision(sensorRight as Shape, other, result)) {
          const { id: otherId, tag } = other;
          if (tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD))
            rightSensorInputSum += pheromonesLifeTimers[otherId];
        }
      }

      if (centerSensorInputSum > max(leftSensorInputSum, rightSensorInputSum)) {
        xvTarget = sensorCenter.x - x;
        yvTarget = sensorCenter.y - y;
        velocityInterpolationSpeed = 12;
        skipRandomDirectionChange = true;
      } else if (leftSensorInputSum > rightSensorInputSum) {
        xvTarget = sensorLeft.x - x;
        yvTarget = sensorLeft.y - y;
        velocityInterpolationSpeed = 12;
        skipRandomDirectionChange = true;
      } else if (rightSensorInputSum > leftSensorInputSum) {
        xvTarget = sensorRight.x - x;
        yvTarget = sensorRight.y - y;
        velocityInterpolationSpeed = 12;
        skipRandomDirectionChange = true;
      }
      // otherwise keep moving forward

      if (!skipRandomDirectionChange) {
        const rotationChangeTImer = timers.get(id);
        if (rotationChangeTImer!.update(deltaTimeSeconds)) {
          rotationDirectionSign *= -1;
          turnAngle = random() * halfPI * rotationDirectionSign;
        }
      }

      turnAngle = normalizeRadians(turnAngle);
      // rotate velocity by turn angle
      if (turnAngle !== 0) {
        const angleWithDirection = turnAngle * rotationDirectionSign;
        const c = cos(angleWithDirection);
        const s = sin(angleWithDirection);
        xvTarget = c * xvTarget - s * yvTarget;
        yvTarget = s * xvTarget + c * yvTarget;
      }

      length = sqrt(xvTarget * xvTarget + yvTarget * yvTarget);
      xvTarget /= length;
      yvTarget /= length;

      length = sqrt(xVelocity * xVelocity + yVelocity * yVelocity);
      xVelocity /= length;
      yVelocity /= length;

      if (collisionsCount > 1 && !hasFood) {
        /**
         * * Any situation with more than one collision means run the hell out of here!
         * Otherwise ants will start creating tight groups like hippies at woodstock and eventually
         * break the collision detection, i.e. start pushing each other through
         * shapes bounds.
         * ! TO DO: fix this shit...
         */
        velocityInterpolationSpeed = 20;
        speedInterpolationSpeed = 5;
        speedTarget = maxSpeed * 1.2;
      }

      if (xvTarget !== xVelocity) {
        xVelocity = interpolate(xVelocity, xvTarget, deltaTimeSeconds, velocityInterpolationSpeed);
      }

      if (yvTarget !== yVelocity) {
        yVelocity = interpolate(yVelocity, yvTarget, deltaTimeSeconds, velocityInterpolationSpeed);
      }

      length = sqrt(xVelocity * xVelocity + yVelocity * yVelocity);
      xVelocity /= length;
      yVelocity /= length;

      ant.xv = xVelocity;
      ant.yv = yVelocity;

      speed = interpolate(speed, speedTarget, deltaTimeSeconds, speedInterpolationSpeed);

      const antSprite = antsSprites.get(id)!;
      antSprite.x = x;
      antSprite.y = y;
      antSprite.rotation = -atan2(xVelocity, yVelocity);

      if (hasFood) {
        const foodChunkSprite = foodBeingCarriedSprites.get(id);
        if (foodChunkSprite) {
          foodChunkSprite.x = x;
          foodChunkSprite.y = y;
          foodChunkSprite.rotation = antSprite.rotation;
        }
      }

      if (
        nestPheromoneStrength > 0 &&
        pheromonesEmmisionCounter >= timeBetweenPhereomonesEmission
      ) {
        const pheromoneId = lastPheromoneId;
        const collisionShape = pheremonesCollisionShapes.get(pheromoneId);
        if (!collisionShape) {
          const newPheromoneCollisionShape = pheromonesCollisions.addCircle(
            x,
            y,
            pheromoneCollisionShapeRadius,
            hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST,
            1,
            0,
            pheromoneId,
          );
          pheremonesCollisionShapes.set(pheromoneId, newPheromoneCollisionShape);
          const pheromoneSprite = Sprite.from(
            hasFood ? foodPheromoneTexture : nestPheromoneTexture,
          );
          pheromoneSprite.x = x;
          pheromoneSprite.y = y;
          pheromoneSprite.anchor.set(0.5);
          pheromoneSprite.scale.set(0.2 * pheromoneCollisionShapeRadius);
          pheromoneSprite.zIndex = 0;
          pheromonesSprites.set(pheromoneId, pheromoneSprite);
          graphics.addChild(pheromoneSprite);
        } else {
          collisionShape.x = x;
          collisionShape.y = y;
          collisionShape.id = pheromoneId;
          collisionShape.tag = hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST;
          const existingSprite = pheromonesSprites.get(pheromoneId)!;
          existingSprite.x = x;
          existingSprite.y = y;
        }
        pheromonesLifeTimers[pheromoneId] = feromonesLifetime;

        lastPheromoneId++;
        if (lastPheromoneId >= maxPheromonesAllowed) lastPheromoneId = 0;
        nestPheromoneStrength--;
      }

      if (x > 0 && y > 0 && x < worldWidth && y < worldHeight) antsOnScreenCounter++;

      antsPropsInt8[propInt8Id + speedId] = speed * mapRange(abs(turnAngle), 0, PI, 1, 0.3);
      antsPropsInt8[propInt8Id + targetSpeedId] = speedTarget;
      antsPropsInt8[propInt8Id + maxSpeedId] = maxSpeed;
      antsPropsInt8[propInt8Id + rotationDirectionId] = rotationDirectionSign;
      antsPropsInt8[propInt8Id + hasFoodId] = hasFood;
      antsPropsInt8[propInt8Id + pheromoneStrengthId] = nestPheromoneStrength;

      antsPropsFloat16[propFloat16Id + xvTargetId] = xvTarget;
      antsPropsFloat16[propFloat16Id + yvTargetId] = yvTarget;
      antsPropsFloat16[propFloat16Id + xvId] = xVelocity;
      antsPropsFloat16[propFloat16Id + yvId] = yVelocity;
    });

    if (pheromonesEmmisionCounter >= timeBetweenPhereomonesEmission) {
      pheromonesEmmisionCounter = 0;
    }

    pheromonesLifeTimers.forEach((lifeTime: number, id: number): void => {
      if (pheromonesLifeTimers[id] > 0) {
        const remainingLife = lifeTime - deltaTimeMILISeconds;
        pheromonesLifeTimers[id] = remainingLife > 0 ? remainingLife : 0;
        if (remainingLife < 1) {
          const shape = pheremonesCollisionShapes.get(id);
          if (shape) {
            pheromonesCollisions.remove(shape as Shape);
            pheremonesCollisionShapes.delete(id);
          }
          const sprite = pheromonesSprites.get(id)!;
          graphics.removeChild(sprite);
          pheromonesSprites.delete(id);
        }
      }
    });

    _draw.clear();
    // _draw.lineStyle(1, 0xff0000);
    _draw.lineStyle(1, 0x005500);
    // pheremonesCollisionShapes.forEach((pheromone) => {
    //   pheromone.draw(_draw);
    // });
    // for (const bound of worldBounds) bound.draw(draw);
    // antsCollisionShapes.forEach((ant) => {
    //   ant.draw(_draw);
    // });
    // draw.lineStyle(1, 0x00ff00);
    // foodCollisionShapes.forEach((bite) => {
    //   bite.draw(draw);
    // });
    // sensorCenter.draw(_draw);
    // sensorLeft.draw(_draw);
    // sensorRight.draw(_draw);
    // collisions.draw(_draw);

    if (debugTimer.update(deltaTimeSeconds)) {
      updateFPSDisplay(deltaTimeSeconds);
      const { size } = antsCollisionShapes;
      updateAntsCounter(size, size - antsOnScreenCounter);
    }

    lastTime = frameStartTime;
  }

  makeSomeFood(
    ({ id, foodCollisionShape, foodSprite, properties }): void => {
      foodCollisionShapes.set(id, foodCollisionShape);
      antsCollisions.insert(foodCollisionShape);
      foodSprites.set(id, foodSprite);
      graphics.addChild(foodSprite);
      foodProps.set(id, properties);
    },
    worldWidth * 0.7,
    worldHeight * 0.7,
  );

  releaseTheAntsOneByOne(
    ({
      id,
      antCollisionShape,
      antSprite,
      rotationChangeTimer,
      propertiesInt8,
      propertiesFloat16,
    }): boolean => {
      antsCollisionShapes.set(id, antCollisionShape);
      antsCollisions.insert(antCollisionShape);
      antsSprites.set(id, antSprite);
      graphics.addChild(antSprite);
      timers.set(id, rotationChangeTimer);

      propertiesInt8.forEach((prop: number, index: number) => {
        antsPropsInt8[id * antPropsInt8Count + index] = prop;
      });

      propertiesFloat16.forEach((prop: number, index: number) => {
        antsPropsFloat16[id * antPropsFloat16Count + index] = prop;
      });

      return antsCollisionShapes.size < antsCount;
    },
    nest.x,
    nest.y,
    // worldWidth,
    // worldHeight,
    antsScale,
    // antsCount,
  );

  let isMouseDown = false;
  const spawnFoodPheromone = true;

  document.addEventListener('mousedown', () => {
    isMouseDown = true;
  });
  document.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  document.addEventListener('mousemove', (event: MouseEvent) => {
    if (isMouseDown) {
      const [x, y] = getMousePositionFromEvent(event);
      const pheromoneId = lastPheromoneId;
      const newPheromoneCollisionShape = antsCollisions.addCircle(
        x,
        y,
        pheromoneCollisionShapeRadius,
        spawnFoodPheromone ? PHEROMONE_FOOD : PHEROMONE_NEST,
        1,
        0,
        pheromoneId,
      );
      pheremonesCollisionShapes.set(pheromoneId, newPheromoneCollisionShape);
      const pheromoneSprite = Sprite.from(
        spawnFoodPheromone ? foodPheromoneTexture : nestPheromoneTexture,
      );
      pheromoneSprite.x = x;
      pheromoneSprite.y = y;
      pheromoneSprite.anchor.set(0.5);
      pheromoneSprite.scale.set(0.2 * pheromoneCollisionShapeRadius);
      pheromoneSprite.zIndex = 0;
      pheromonesSprites.set(pheromoneId, pheromoneSprite);
      graphics.addChild(pheromoneSprite);
      pheromonesLifeTimers[pheromoneId] = feromonesLifetime;

      lastPheromoneId++;
      if (lastPheromoneId >= maxPheromonesAllowed) lastPheromoneId = 0;
    }
  });

  graphicsEngine.ticker.add(simulationUpdate);
};
