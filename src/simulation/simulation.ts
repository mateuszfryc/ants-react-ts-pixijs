import * as PIXI from 'pixi.js';

import { TAGS } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { setupGraphics } from 'utils/graphics';
// prettier-ignore
import { debugTimer, setupAntCounter, setupFPSDisplay, setupPheromonesCounter } from 'simulation/debug';
// prettier-ignore
import {
  halfPI, interpolate, mapRange, mapRangeClamped,
  normalizeRadians, PI, randomInRange, randomSign, twoPI } from 'utils/math';
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
  const antsCount = 50;
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
    randomDirectionMaxAngle,
    timers,

    antPropsIndexes: {
      idIndex,
      directionXIndex,
      directionYIndex,
      turnAngleIndex,
      speedIndex,
      speedTargetIndex,
      hasFoodIndex,
      pheromoneStrengthIndex,
    },
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
        turnAngle,
        speed,
        speedTarget,
        maxSpeed,
        hasFood,
        pheromoneStrength,
      ] = ant;
      const antBody = antsCollisionShapes.get(id);
      let directionTargetX = directionX;
      let directionTargetY = directionY;
      let speedInterpolationSpeed = 2;
      let directionInterpRatio = 1;
      let collisionsCount = 0;
      let isStandingOnPheromone = false;

      const rotationChangeTImer = timers.get(id);
      if (rotationChangeTImer!.update(deltaSeconds)) {
        turnAngle = randomInRange(0, randomDirectionMaxAngle);
      }

      for (const other of antsCollisions.getPotentials(antBody as Shape)) {
        if (antsCollisions.areBodiesColliding(antBody as Shape, other, collisionTestResult)) {
          let [overlap, overlapX, overlapY] = collisionTestResult;
          const { id: otherId, tag, radius } = other;

          /* eslint-disable indent */
          switch (tag) {
            case ANT:
              collisionsCount++;
              if (!hasFood) {
                overlap *= 0.5;
                antBody.x -= overlap * overlapX;
                antBody.y -= overlap * overlapY;
                other.x -= overlap * overlapX;
                other.y -= overlap * overlapY;
                turnAngle = 0;
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
                turnAngle = 0;
                // directionInterpRatio = 20;
                directionTargetX = -directionX;
                directionTargetY = -directionY;
              } else {
                pheromoneStrength = maxPheromonesEmission;
              }
              break;

            case NEST_VISIBLE_AREA:
              if (hasFood) {
                directionTargetX = nest.x - antBody.x;
                directionTargetY = nest.y - antBody.y;
                turnAngle = 0;
                // directionInterpRatio = 10;
              }
              break;

            case PHEROMONE_FOOD:
              isStandingOnPheromone = true;
              break;

            case PHEROMONE_NEST:
              isStandingOnPheromone = true;
              break;

            case FOOD:
              collisionsCount++;
              antBody.x -= overlap * overlapX;
              antBody.y -= overlap * overlapY;
              // directionInterpRatio = 20;
              directionTargetX = -directionX;
              directionTargetY = -directionY;
              turnAngle = 0;
              speed = 0;
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
              break;

            default:
              collisionsCount++;
              antBody.x -= overlap * overlapX;
              antBody.y -= overlap * overlapY;
              speed = 0;
              turnAngle = 0;
              /** By default move along reflection vector */
              directionTargetX = directionX - 2 * (directionX * -overlapX) * -overlapX;
              directionTargetY = directionY - 2 * (directionY * -overlapY) * -overlapY;
              // directionInterpRatio = 20;

              break;
          }
          /* eslint-enable indent */
        }
      }

      const { x, y } = antBody;

      const sensorsResult = updateAntSensors(x, y, directionX, directionY, hasFood, frameStartTime);
      const [haveFoundPheromone] = sensorsResult;

      if (haveFoundPheromone) {
        [, directionTargetX, directionTargetY] = sensorsResult;
        turnAngle = 0;
      }

      // if (collisionsCount > 1 && !hasFood) {
      //   /**
      //    * * Any situation with more than one collision means run the hell out of here!
      //    * Otherwise ants will start creating tight groups like hippies at woodstock and eventually
      //    * break the collision detection, i.e. start pushing each other through
      //    * shapes bounds.
      //    * ! TO DO: fix this shit...
      //    */
      //   directionInterpRatio = 1;
      //   speedInterpolationSpeed = 5;
      //   speedTarget = maxSpeed * 1.2;
      // }

      if (turnAngle > 0) {
        const partOfAngle = deltaSeconds * 6;
        const angle = atan2(directionTargetY, directionTargetX) + partOfAngle * randomSign();
        directionTargetX = cos(angle);
        directionTargetY = sin(angle);
        turnAngle -= partOfAngle;
      }

      /**
       * In this setup the PI radian angle points up,
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

      speed = interpolate(speed, speedTarget, deltaSeconds, speedInterpolationSpeed);

      const antSprite = antsSpritesMap.get(id)!;
      antSprite.x = x;
      antSprite.y = y;
      antSprite.rotation = -atan2(directionX, directionY);

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

      ant[idIndex] = id;
      ant[directionXIndex] = directionX;
      ant[directionYIndex] = directionY;
      ant[turnAngleIndex] = turnAngle;
      ant[speedIndex] = speed * mapRange(abs(turnAngle), 0, twoPI, 1, 0.5);
      ant[speedTargetIndex] = speedTarget;
      ant[hasFoodIndex] = hasFood;
      ant[pheromoneStrengthIndex] = pheromoneStrength;
    });

    updatePheromones(frameStartTime);

    _draw.clear();
    _draw.lineStyle(1, 0xff0000);
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
    drawSensors(_draw);
    // _draw.lineStyle(1, 0x660000);
    // antsCollisions.drawBVH(_draw);
    // _draw.lineStyle(1, 0x888888);
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
