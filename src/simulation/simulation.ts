import * as PIXI from 'pixi.js';

import { TAGS } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { setupGraphics } from 'utils/graphics';
// prettier-ignore
import { debugTimer, setupAntCounter, setupFPSDisplay, setupPheromonesCounter } from 'simulation/debug';
// prettier-ignore
import {
  halfPI, interpolate, mapRange, mapRangeClamped,
  normalizeRadians, PI, randomInRange } from 'utils/math';
import { Nest } from './Nest';
import { setupAnts } from './Ant';
// prettier-ignore
import {
  makeSomeFood, foodImageTexture, foodSprites,
  foodBitesSpritesMap, foodCollisionShapes, foodProps } from './Food';
// prettier-ignore
import {
  Pheromone, setupAntsPheromonesSensors, pheromones, sensorsTurnInterpolationSpeed,
  pheromonesSpritesMap, pheromonesLifeSpan, foodPheromoneTexture, nestPheromoneTexture } from './Pheromones';

const { random, min, atan2, cos, sin, abs, sign, sqrt, max } = Math;
const { Sprite } = PIXI;

export const setupSimulation = (container: HTMLElement): void => {
  const antsCount = 300;
  const {
    graphicsEngine,
    stage,
    antsSprites,
    foodBitesSprites,
    foodPheromonesSprites,
    nestPheromonesSprites,
    _draw,
  } = setupGraphics(container, antsCount);
  const result = new Float32Array(new ArrayBuffer(12)); // 3 numbers
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  const Ants = setupAnts(antsCount, stage);
  const {
    antsScale,
    antsCollisionShapes,
    antsCollisions,
    antsSpritesMap,
    timers,
    antsPropsInt8,
    antsPropsFloat16,
    antPropsInt8Count,
    antPropsFloat16Count,
    antsPropsInt8IDs,
    antsPropsFloat16IDs,
    maxPheromonesEmission,
    feromonesLifetime,
  } = Ants;
  const {
    speedId,
    targetSpeedId,
    maxSpeedId,
    rotationDirectionId,
    hasFoodId,
    pheromoneStrengthId,
  } = antsPropsInt8IDs;
  const { xvId, yvId, xvTargetId, yvTargetId } = antsPropsFloat16IDs;
  const { updatePheromonesCounter } = setupPheromonesCounter();
  const { ANT, FOOD, NEST, PHEROMONE_FOOD, PHEROMONE_NEST } = TAGS;
  const foodDistanceToNest = 200;

  const nest = new Nest(worldWidth * 0.5, worldHeight * 0.5);
  stage.addChild(nest);
  stage.addChild(nest.entranceCoverSprite);
  antsCollisions.insert(nest.body);

  let currentPheromoneId = 0;
  const {
    sensorLeft,
    sensorForward,
    sensorRight,
    updateAntSensors,
    addPheromoneShape,
    removePheromoneShape,
    pheromoneEmissionTimer,
    drawAntSensors,
  } = setupAntsPheromonesSensors(antsScale);

  antsCollisions.createWorldBounds(worldWidth, worldHeight, 200, -199);
  /**
   * Variables used for ants update loop.
   * Forward declaration allows to save time otherwise used
   * to declare them on each step of the loop.
   */
  let lastTime = performance.now();

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaSeconds = min((frameStartTime - lastTime) / 1000, 0.5);
    let antsOnScreenCounter = 0;
    const shouldSpawnPheromones = pheromoneEmissionTimer.update(deltaSeconds);
    let propFloat16Id = 0;
    let speed = 0;

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
      const propInt8Id = id * antPropsInt8Count;
      propFloat16Id = id * antPropsFloat16Count;

      speed = antsPropsInt8[propInt8Id + speedId];
      let speedTarget = antsPropsInt8[propInt8Id + targetSpeedId];
      let maxSpeed = antsPropsInt8[propInt8Id + maxSpeedId];
      let rotationDirectionSign = antsPropsInt8[propInt8Id + rotationDirectionId];
      let hasFood = antsPropsInt8[propInt8Id + hasFoodId];
      let pheromoneStrength = antsPropsInt8[propInt8Id + pheromoneStrengthId];

      let xVelocity = antsPropsFloat16[propFloat16Id + xvId];
      let yVelocity = antsPropsFloat16[propFloat16Id + yvId];
      let xvTarget = antsPropsFloat16[propFloat16Id + xvTargetId];
      let yvTarget = antsPropsFloat16[propFloat16Id + yvTargetId];

      let speedInterpolationSpeed = 2;
      let velocityInterpolationSpeed = 1;
      let collisionsCount = 0;
      let turnAngle = 0;

      let skipRandomDirectionChange = false;
      let isStandingOnPheromone = false;

      for (const other of antsCollisions.getPotentials(ant as Shape)) {
        if (antsCollisions.areBodiesColliding(ant as Shape, other, result)) {
          const overlap = result[0];
          const overlap_x = result[1];
          const overlap_y = result[2];
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
                const foodChunkToBeRemoved = foodBitesSpritesMap.get(id);
                if (foodChunkToBeRemoved) {
                  foodBitesSprites.removeChild(foodChunkToBeRemoved);
                  foodBitesSpritesMap.delete(id);
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
              isStandingOnPheromone = true;
              break;

            case PHEROMONE_NEST:
              isStandingOnPheromone = true;
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

      const [frontSensorInputSum, leftSensorInputSum, rightSensorInputSum] = updateAntSensors(
        x,
        y,
        xVelocity,
        yVelocity,
        hasFood,
      );

      if (frontSensorInputSum > max(leftSensorInputSum, rightSensorInputSum)) {
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
        // const angleWithDirection = turnAngle * rotationDirectionSign;
        const c = cos(turnAngle);
        const s = sin(turnAngle);
        xvTarget = c * xvTarget - s * yvTarget;
        yvTarget = s * xvTarget + c * yvTarget;
      }

      let length = sqrt(xvTarget * xvTarget + yvTarget * yvTarget);
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

      const antSprite = antsSpritesMap.get(id)!;
      antSprite.x = x;
      antSprite.y = y;
      antSprite.rotation = -atan2(xVelocity, yVelocity);

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
        const newPheromone = new Pheromone(
          currentPheromoneId,
          x,
          y,
          hasFood ? PHEROMONE_FOOD : PHEROMONE_NEST,
          frameStartTime,
        );
        addPheromoneShape(newPheromone);
        pheromones.set(currentPheromoneId, newPheromone);

        const pheromoneSprite = Sprite.from(hasFood ? foodPheromoneTexture : nestPheromoneTexture);
        pheromoneSprite.x = x;
        pheromoneSprite.y = y;
        pheromoneSprite.anchor.set(0.5);
        pheromoneSprite.scale.set(0.2 * newPheromone.radius);
        pheromonesSpritesMap.set(currentPheromoneId, pheromoneSprite);
        if (hasFood) {
          foodPheromonesSprites.addChild(pheromoneSprite);
        } else nestPheromonesSprites.addChild(pheromoneSprite);

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

    pheromones.forEach(({ emissionTimeStamp, id }: Pheromone): void => {
      let lifeSpan = (frameStartTime - emissionTimeStamp) / 1000;
      const sprite = pheromonesSpritesMap.get(id)!;
      if (lifeSpan >= pheromonesLifeSpan) {
        const circle = pheromones.get(id);
        if (circle) {
          removePheromoneShape(circle);
          pheromones.delete(id);
        }
        foodPheromonesSprites.removeChild(sprite);
        nestPheromonesSprites.removeChild(sprite);
        pheromonesSpritesMap.delete(id);
      } else {
        sprite.alpha = 1 - lifeSpan / pheromonesLifeSpan;
      }
    });

    // _draw.clear();
    // _draw.lineStyle(1, 0xff0000);
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
    // drawAntSensors(_draw);
    // antsCollisions.draw(_draw);

    if (debugTimer.update(deltaSeconds)) {
      updateFPSDisplay(deltaSeconds);
      const { size } = antsCollisionShapes;
      updateAntsCounter(size, size - antsOnScreenCounter);
      updatePheromonesCounter(pheromones.size);
    }

    lastTime = frameStartTime;
  }

  makeSomeFood(
    ({ id, foodCollisionShape, foodSprite, properties }): void => {
      foodCollisionShapes.set(id, foodCollisionShape);
      antsCollisions.insert(foodCollisionShape);
      foodSprites.set(id, foodSprite);
      stage.addChild(foodSprite);
      foodProps.set(id, properties);
    },
    nest.x + foodDistanceToNest,
    nest.y + foodDistanceToNest,
  );

  Ants.throwAllAtOnce(worldWidth, worldHeight);

  graphicsEngine.ticker.add(simulationUpdate);
  graphicsEngine.start();
};
