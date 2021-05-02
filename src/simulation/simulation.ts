import * as PIXI from 'pixi.js';

import { TAGS } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { Result } from 'simulation/collisions/result';
import { debugTimer, setupAntCounter, setupFPSDisplay } from 'simulation/debug';
// prettier-ignore
import { halfPI, interpolate, mapRange, mapRangeClamped,
  normalizeRadians, PI, randomInRange } from 'utils/math';
import { Timer } from './Timer';
// prettier-ignore
import { antsCount, antsScale, releaseTheAntsOneByOne, antPropsInt8Count,
  antPropsFloat16Count, antsPropsInt8IDs, antsPropsFloat16IDs, maxPheromonesEmission,
  antsCollisions, antsCollisionShapes, antsPropsInt8, antsPropsFloat16, antsSprites } from './Ant';
// prettier-ignore
import { makeSomeFood, foodImageTexture, foodSprites,
  foodBeingCarriedSprites, foodCollisionShapes, foodProps } from './Food';
// prettier-ignore
import { Pheromone, setupAntsSensors, pheromonesCollisions, pheromones, sensorForwardDistance,
  sensorsSideDistance, sensorsSideSpread, sensorsTurnInterpolationSpeed, pheromonesSprites,
  pheromoneEmissionTimer, nestPheromoneTexture, foodPheromoneTexture, pheromoneInitialLifeSpan } from './Pheromones';
import { Nest } from './Nest';

const { random, min, atan2, cos, sin, abs, sign, sqrt, max } = Math;
const { Sprite } = PIXI;

export const setupSimulation = (
  graphicsEngine: PIXI.Application,
  _container: HTMLElement,
  _draw: PIXI.Graphics,
): void => {
  const { stage: graphics } = graphicsEngine;
  const result = new Result();
  // const result = new Float32Array(new ArrayBuffer(12)); // 3 numbers
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = _container;
  antsCollisions.createWorldBounds(worldWidth, worldHeight, 200, -199);
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  // prettier-ignore
  const { speedId, targetSpeedId, maxSpeedId, rotationDirectionId, hasFoodId, pheromoneStrengthId } = antsPropsInt8IDs;
  const { xvId, yvId, xvTargetId, yvTargetId } = antsPropsFloat16IDs;
  const { ANT, FOOD, NEST, PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
  let antsOnScreenCounter = 0;

  const timers = new Map<number, Timer>();

  const nest = new Nest(worldWidth * 0.5, worldHeight * 0.5);
  graphics.addChild(nest);
  graphics.addChild(nest.entranceCoverSprite);
  antsCollisions.insert(nest.body);

  let currentPheromoneId = 0;
  const { sensorLeft, sensorForward, sensorRight } = setupAntsSensors(antsScale);

  /**
   * Variables used for ants update loop.
   * Forward declaration allows to save time otherwise used
   * to declare them on each step of the loop.
   */
  let lastTime = performance.now();
  let frameStartTime = 0;
  let deltaSeconds = 0;
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
  let pheromoneStrength = 0;
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
  let shouldSpawnPheromones = false;

  function simulationUpdate() {
    frameStartTime = performance.now();
    deltaSeconds = min((frameStartTime - lastTime) / 1000, 0.5);
    antsOnScreenCounter = 0;
    shouldSpawnPheromones = pheromoneEmissionTimer.update(deltaSeconds);

    antsCollisionShapes.forEach((ant) => {
      const { id } = ant;
      propFloat16Id = id * antPropsFloat16Count;
      speed = antsPropsInt8[id * antPropsInt8Count + speedId];
      ant.x += speed * antsPropsFloat16[propFloat16Id + xvId] * deltaSeconds;
      ant.y += speed * antsPropsFloat16[propFloat16Id + yvId] * deltaSeconds;
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
      pheromoneStrength = antsPropsInt8[propInt8Id + pheromoneStrengthId];

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
                skipRandomDirectionChange = true;
                velocityInterpolationSpeed = 20;
                turnAngle =
                  randomInRange(0.5, 1) *
                    sign(overlap_y > 0 ? 1 : -1) *
                    atan2(-overlap_x, -overlap_y) +
                  atan2(xvTarget, yvTarget);
              } else {
                pheromoneStrength = maxPheromonesEmission;
              }
              break;

            case PHEROMONE_FOOD:
              break;

            case PHEROMONE_NEST:
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
                  pheromoneStrength = maxPheromonesEmission;
                }
              }
              skipRandomDirectionChange = true;
              velocityInterpolationSpeed = 20;
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

      pheromonesCollisions.update();

      for (const other of pheromonesCollisions.getPotentials(sensorForward)) {
        if (pheromonesCollisions.areCirclesColliding(sensorForward, other)) {
          const { id: otherId, tag } = other;
          if (tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD))
            centerSensorInputSum += pheromones.get(otherId)!.lifeSpan;
        }
      }

      for (const other of pheromonesCollisions.getPotentials(sensorLeft)) {
        if (pheromonesCollisions.areCirclesColliding(sensorLeft, other)) {
          const { id: otherId, tag } = other;
          if (tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD))
            leftSensorInputSum += pheromones.get(otherId)!.lifeSpan;
        }
      }

      for (const other of pheromonesCollisions.getPotentials(sensorRight)) {
        if (pheromonesCollisions.areCirclesColliding(sensorRight, other)) {
          const { id: otherId, tag } = other;
          if (tag === (hasFood ? PHEROMONE_NEST : PHEROMONE_FOOD))
            rightSensorInputSum += pheromones.get(otherId)!.lifeSpan;
        }
      }

      if (centerSensorInputSum > max(leftSensorInputSum, rightSensorInputSum)) {
        xvTarget = sensorForward.x - x;
        yvTarget = sensorForward.y - y;
        velocityInterpolationSpeed = sensorsTurnInterpolationSpeed;
        skipRandomDirectionChange = true;
      } else if (leftSensorInputSum > rightSensorInputSum) {
        xvTarget = sensorLeft.x - x;
        yvTarget = sensorLeft.y - y;
        velocityInterpolationSpeed = sensorsTurnInterpolationSpeed;
        skipRandomDirectionChange = true;
      } else if (rightSensorInputSum > leftSensorInputSum) {
        xvTarget = sensorRight.x - x;
        yvTarget = sensorRight.y - y;
        velocityInterpolationSpeed = sensorsTurnInterpolationSpeed;
        skipRandomDirectionChange = true;
      }
      // otherwise keep moving forward

      if (!skipRandomDirectionChange) {
        const rotationChangeTImer = timers.get(id);
        if (rotationChangeTImer!.update(deltaSeconds)) {
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
        xVelocity = interpolate(xVelocity, xvTarget, deltaSeconds, velocityInterpolationSpeed);
      }

      if (yvTarget !== yVelocity) {
        yVelocity = interpolate(yVelocity, yvTarget, deltaSeconds, velocityInterpolationSpeed);
      }

      length = sqrt(xVelocity * xVelocity + yVelocity * yVelocity);
      xVelocity /= length;
      yVelocity /= length;

      ant.xv = xVelocity;
      ant.yv = yVelocity;

      speed = interpolate(speed, speedTarget, deltaSeconds, speedInterpolationSpeed);

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

      if (pheromoneStrength > 0 && shouldSpawnPheromones) {
        const pheromoneId = currentPheromoneId;
        const newPheromone = new Pheromone(
          pheromoneId,
          x,
          y,
          hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST,
        );
        pheromonesCollisions.insert(newPheromone);
        pheromones.set(pheromoneId, newPheromone);

        const pheromoneSprite = Sprite.from(hasFood ? foodPheromoneTexture : nestPheromoneTexture);
        pheromoneSprite.x = x;
        pheromoneSprite.y = y;
        pheromoneSprite.anchor.set(0.5);
        pheromoneSprite.scale.set(0.2 * newPheromone.radius);
        pheromoneSprite.zIndex = 0;
        pheromonesSprites.set(pheromoneId, pheromoneSprite);
        graphics.addChild(pheromoneSprite);

        currentPheromoneId++;
        pheromoneStrength--;
      }

      if (x > 0 && y > 0 && x < worldWidth && y < worldHeight) antsOnScreenCounter++;

      antsPropsInt8[propInt8Id + speedId] = speed * mapRange(abs(turnAngle), 0, PI, 1, 0.3);
      antsPropsInt8[propInt8Id + targetSpeedId] = speedTarget;
      antsPropsInt8[propInt8Id + maxSpeedId] = maxSpeed;
      antsPropsInt8[propInt8Id + rotationDirectionId] = rotationDirectionSign;
      antsPropsInt8[propInt8Id + hasFoodId] = hasFood;
      antsPropsInt8[propInt8Id + pheromoneStrengthId] = pheromoneStrength;

      antsPropsFloat16[propFloat16Id + xvTargetId] = xvTarget;
      antsPropsFloat16[propFloat16Id + yvTargetId] = yvTarget;
      antsPropsFloat16[propFloat16Id + xvId] = xVelocity;
      antsPropsFloat16[propFloat16Id + yvId] = yVelocity;
    });

    pheromones.forEach((pheromone: Pheromone): void => {
      const { lifeSpan, id } = pheromone;
      if (lifeSpan > 0) {
        let remainingLife = lifeSpan - deltaSeconds;
        remainingLife = remainingLife > 0 ? remainingLife : 0;
        pheromone.lifeSpan = remainingLife > 0 ? remainingLife : 0;
        const sprite = pheromonesSprites.get(id)!;
        sprite.alpha = remainingLife / pheromoneInitialLifeSpan;
        if (remainingLife < 1) {
          const circle = pheromones.get(id);
          if (circle) {
            pheromonesCollisions.remove(circle);
            pheromones.delete(id);
          }
          graphics.removeChild(sprite);
          pheromonesSprites.delete(id);
        }
      }
    });

    _draw.clear();
    _draw.lineStyle(1, 0xff0000);
    // _draw.lineStyle(1, 0x005500);
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
    sensorForward.draw(_draw);
    sensorLeft.draw(_draw);
    sensorRight.draw(_draw);
    // antsCollisions.draw(_draw);

    if (debugTimer.update(deltaSeconds)) {
      updateFPSDisplay(deltaSeconds);
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
    antsScale,
  );

  graphicsEngine.ticker.add(simulationUpdate);
};
