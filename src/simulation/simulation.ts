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
import { createNest } from './Nest';
import { setupAnts } from './Ant';
// prettier-ignore
import {
  makeSomeFood, foodImageTexture, foodSprites,
  foodBitesSpritesMap, foodCollisionShapes, foodProps } from './Food';
import { setupAntsPheromones } from './Pheromones';
import { Circle } from './collisions/circle';

const { random, min, atan2, cos, sin, abs, sign, sqrt } = Math;
const { Sprite } = PIXI;

export const setupSimulation = (container: HTMLElement): void => {
  const antsCount = 400;
  const { graphicsEngine, stage, antsSprites, foodBitesSprites, _draw } = setupGraphics(
    container,
    antsCount,
  );

  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;

  const Ants = setupAnts(antsCount, antsSprites);
  const {
    antsCollisions,
    antsCollisionShapes,
    antsProps,
    antsScale,
    antsSpritesMap,
    maxPheromonesEmission,
    timers,

    antPropsIndexes: { iSpeed, iXVelocity, iYVelocity },
  } = Ants;

  const {
    addPheromone,
    drawSensors,
    getPheromonesCount,
    pheromoneEmissionTimer,
    sensorsTurnInterpolationSpeed,
    updateAntSensors,
    updatePheromones,
  } = setupAntsPheromones(antsCount, antsScale, stage);

  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  const { updatePheromonesCounter } = setupPheromonesCounter();
  const { ANT, FOOD, NEST, PHEROMONE_FOOD, PHEROMONE_NEST, NEST_VISIBLE_AREA } = TAGS;
  const foodDistanceToNest = 200;
  const nest = createNest(worldWidth * 0.5, worldHeight * 0.5, stage, antsCollisions);
  const collisionTestResult: number[] = [];
  let lastTime = performance.now();

  Ants.releaseOneByOne(nest.x, nest.y);
  antsCollisions.createWorldBounds(worldWidth, worldHeight, 200, -199);

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaSeconds = min((frameStartTime - lastTime) / 1000, 0.5);
    let antsOnScreenCounter = 0;
    const shouldSpawnPheromones = pheromoneEmissionTimer.update(deltaSeconds);

    antsCollisionShapes.forEach((ant: Circle) => {
      const { id } = ant;
      const props = antsProps[id];
      const speed = props[iSpeed];
      ant.x += speed * props[iXVelocity] * deltaSeconds;
      ant.y += speed * props[iYVelocity] * deltaSeconds;
    });

    antsCollisions.update();

    antsProps.forEach((ant: number[]) => {
      let [
        id,
        xVelocity,
        yVelocity,
        velocityTargetX,
        velocityTargetY,
        speed,
        speedTarget,
        maxSpeed,
        rotationDirectionSign,
        hasFood,
        pheromoneStrength,
      ] = ant;
      const antBody = antsCollisionShapes.get(id);

      let speedInterpolationSpeed = 2;
      let velocityInterpolationSpeed = 1;
      let collisionsCount = 0;
      let turnAngle = 0;

      let skipRandomDirectionChange = false;
      let isStandingOnPheromone = false;

      for (const other of antsCollisions.getPotentials(antBody as Shape)) {
        if (antsCollisions.areBodiesColliding(antBody as Shape, other, collisionTestResult)) {
          const [overlap, overlap_x, overlap_y] = collisionTestResult;
          const { id: otherId, tag, radius } = other;

          /* eslint-disable indent */
          switch (tag) {
            case ANT:
              collisionsCount++;
              if (!hasFood) {
                antBody.x -= overlap * 0.5 * overlap_x;
                antBody.y -= overlap * 0.5 * overlap_y;
                other.x -= overlap * 0.5 * overlap_x;
                other.y -= overlap * 0.5 * overlap_y;
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
                velocityTargetX *= -1;
                velocityTargetY *= -1;
              } else {
                pheromoneStrength = maxPheromonesEmission;
              }
              break;

            case NEST_VISIBLE_AREA:
              if (hasFood) {
                const nestX = nest.x - antBody.x;
                const nestY = nest.y - antBody.y;
                velocityTargetX = nestX;
                velocityTargetY = nestY;
                skipRandomDirectionChange = true;
                velocityInterpolationSpeed = 10;
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
              antBody.x -= overlap * overlap_x;
              antBody.y -= overlap * overlap_y;
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
              velocityTargetX *= -1;
              velocityTargetY *= -1;

              break;
          }
          /* eslint-enable indent */
        }
      }

      const { x, y } = antBody;

      const sensorsResult = updateAntSensors(x, y, xVelocity, yVelocity, hasFood, frameStartTime);
      const [haveFoundPheromone] = sensorsResult;

      if (haveFoundPheromone) {
        [, velocityTargetX, velocityTargetY] = sensorsResult;
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
        velocityTargetX = c * velocityTargetX - s * velocityTargetY;
        velocityTargetY = s * velocityTargetX + c * velocityTargetY;
      }

      let length = sqrt(velocityTargetX * velocityTargetX + velocityTargetY * velocityTargetY);
      velocityTargetX /= length;
      velocityTargetY /= length;

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

      if (velocityTargetX !== xVelocity) {
        xVelocity = interpolate(
          xVelocity,
          velocityTargetX,
          deltaSeconds,
          velocityInterpolationSpeed,
        );
      }

      if (velocityTargetY !== yVelocity) {
        yVelocity = interpolate(
          yVelocity,
          velocityTargetY,
          deltaSeconds,
          velocityInterpolationSpeed,
        );
      }

      length = sqrt(xVelocity * xVelocity + yVelocity * yVelocity);
      xVelocity /= length;
      yVelocity /= length;

      antBody.xv = xVelocity;
      antBody.yv = yVelocity;

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
        addPheromone(x, y, hasFood, frameStartTime);
        pheromoneStrength--;
      }

      if (x > 0 && y > 0 && x < worldWidth && y < worldHeight) antsOnScreenCounter++;

      ant[0] = id;
      ant[1] = xVelocity;
      ant[2] = yVelocity;
      ant[3] = velocityTargetX;
      ant[4] = velocityTargetY;
      ant[5] = speed * mapRange(abs(turnAngle), 0, PI, 1, 0.3);
      ant[6] = speedTarget;
      ant[7] = maxSpeed;
      ant[8] = rotationDirectionSign;
      ant[9] = hasFood;
      ant[10] = pheromoneStrength;
    });

    updatePheromones(frameStartTime);

    // _draw.clear();
    // _draw.lineStyle(1, 0xff0000);
    // drawSensors(_draw);
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
      updatePheromonesCounter(getPheromonesCount());
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

  graphicsEngine.ticker.add(simulationUpdate);
  graphicsEngine.start();
};
