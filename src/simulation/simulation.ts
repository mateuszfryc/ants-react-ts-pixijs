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
import { Circle } from './collisions/circle';
import { Timer } from './Timer';
import {
  releaseTheAnts,
  antPropsInt8Count,
  antPropsFloat16Count,
  antsPropsInt8IDs,
  antsPropsFloat16IDs,
  throwAllAntsAtOnce,
} from './Ant';
import { makeSomeFood, foodImageTexture } from './Food';
import { Body } from './collisions/body';

const { random, min, atan2, cos, sin, abs, sign } = Math;
const { Sprite } = PIXI;

export const setupSimulation = (
  app: PIXI.Application,
  container: HTMLElement,
  _draw: PIXI.Graphics,
): void => {
  const isDebugDrawOn = false;
  const result = new Result();
  const collisions = new Collisions();
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;
  const worldBounds = collisions.createWorldBounds(worldWidth, worldHeight, 200, -199);
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  // eslint-disable-next-line prettier/prettier
  const { speedId, targetSpeedId, maxSpeedId, rotationDirectionId, hasFoodId } = antsPropsInt8IDs;
  // eslint-disable-next-line prettier/prettier
  const { xvId, yvId, xvTargetId, yvTargetId } = antsPropsFloat16IDs;
  const { ANT, FOOD } = TAGS;
  let antsOnScreenCounter = 0;

  const antsCount = 3000;
  const antsCollisionShapes = new Map<number, Circle>();
  /*
    One (1) dimensional array of properties of all the ants.
    Accessing single ant prop is done by:
      antsProps[i * e + p]
    where:
    i = index of the ant
    e = number of properites single ant has
    p = index of single prop within range of ant props, starts with 0 and goes up to e - 1

    the array will look like this:
    antsProps = [x1, y1, speed1, x2, y2, speed2, x3, y3, speed3...xn, yn, speedn]
  */
  const Int8ArrayItemSize = 1;
  const antsPropsInt8: Int8Array = new Int8Array(
    new ArrayBuffer(antsCount * Int8ArrayItemSize * antPropsInt8Count),
  );
  const Float32ArrayItemSize = 4;
  const antsPropsFloat16: Float32Array = new Float32Array(
    new ArrayBuffer(antsCount * Float32ArrayItemSize * antPropsFloat16Count),
  );
  const antsSprites = new Map<number, PIXI.Sprite>();
  const foodSprites = new Map<number, PIXI.Sprite>();
  const foodBeingCarriedSprites = new Map<number, PIXI.Sprite>();
  const foodCollisionShapes = new Map<number, Circle>();
  const foodProps = new Map<number, number[]>();
  const timers = new Map<number, Timer>();

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

  function simulationUpdate() {
    if (!isTabFocused) return;
    const frameStartTime = performance.now();
    const deltaTime = min((frameStartTime - lastTime) / 1000, 0.5);
    antsOnScreenCounter = 0;

    antsCollisionShapes.forEach((ant) => {
      const { id } = ant;
      const propFloat16Id = id * antPropsFloat16Count;
      const speed = antsPropsInt8[id * antPropsInt8Count + speedId];
      ant.x += speed * antsPropsFloat16[propFloat16Id + xvId] * deltaTime;
      ant.y += speed * antsPropsFloat16[propFloat16Id + yvId] * deltaTime;
    });

    collisions.update();

    antsCollisionShapes.forEach((ant) => {
      let { id } = ant;
      const propInt8Id = id * antPropsInt8Count;
      const propFloat16Id = id * antPropsFloat16Count;

      let speed = antsPropsInt8[propInt8Id + speedId];
      let speedTarget = antsPropsInt8[propInt8Id + targetSpeedId];
      let maxSpeed = antsPropsInt8[propInt8Id + maxSpeedId];
      let rotationDirectionSign = antsPropsInt8[propInt8Id + rotationDirectionId];
      let hasFood = antsPropsInt8[propInt8Id + hasFoodId];

      let xv = antsPropsFloat16[propFloat16Id + xvId];
      let yv = antsPropsFloat16[propFloat16Id + yvId];
      let xvTarget = antsPropsFloat16[propFloat16Id + xvTargetId];
      let yvTarget = antsPropsFloat16[propFloat16Id + yvTargetId];

      let speedInterpolationSpeed = 2;
      let velocityInterpolationSpeed = 1;
      let skipRandomDirectionChange = false;
      let collidedWithAntsOnly = true;
      let turnAngle = 0;
      let collisionsCount = 0;

      for (const other of collisions.getPotentials(ant as Shape)) {
        if (collisions.isCollision(ant as Shape, other, result)) {
          collisionsCount++;
          const { overlap, overlap_x, overlap_y } = result;
          const { id: otherId, tag, radius } = other;
          ant.x -= overlap! * overlap_x;
          ant.y -= overlap! * overlap_y;

          /* eslint-disable indent */
          switch (tag) {
            case ANT:
              skipRandomDirectionChange = true;
              break;

            default:
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
                  app.stage.addChild(foodChunkSprite);
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
              collidedWithAntsOnly = false;
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

      if (!skipRandomDirectionChange) {
        const rotationChangeTImer = timers.get(id);
        if (rotationChangeTImer!.update(deltaTime)) {
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

      let length = Math.sqrt(xvTarget * xvTarget + yvTarget * yvTarget);
      xvTarget /= length;
      yvTarget /= length;

      length = Math.sqrt(xv * xv + yv * yv);
      xv /= length;
      yv /= length;

      if (collisionsCount > 1 && collidedWithAntsOnly) {
        /* 
          Any situation with more than one collision means run the hell out of here
          or ants will start creating tight groups like hippies at woodstock and eventually
          break the collision detection, i.e. start pushing each other through
          shapes bounds.
          TO DO: fix this shit...
         */
        velocityInterpolationSpeed = 20;
        speedInterpolationSpeed = 5;
        speedTarget = maxSpeed * 1.5;
      }

      if (xvTarget !== xv) {
        xv = interpolate(xv, xvTarget, deltaTime, velocityInterpolationSpeed);
      }

      if (yvTarget !== yv) {
        yv = interpolate(yv, yvTarget, deltaTime, velocityInterpolationSpeed);
      }

      length = Math.sqrt(xv * xv + yv * yv);
      xv /= length;
      yv /= length;

      ant.xv = xv;
      ant.yv = yv;

      speed = interpolate(speed, speedTarget, deltaTime, speedInterpolationSpeed);

      antsPropsInt8[propInt8Id + speedId] = speed * mapRange(abs(turnAngle), 0, PI, 1, 0.3);
      antsPropsInt8[propInt8Id + targetSpeedId] = speedTarget;
      antsPropsInt8[propInt8Id + maxSpeedId] = maxSpeed;
      antsPropsInt8[propInt8Id + rotationDirectionId] = rotationDirectionSign;
      antsPropsInt8[propInt8Id + hasFoodId] = hasFood;

      antsPropsFloat16[propFloat16Id + xvTargetId] = xvTarget;
      antsPropsFloat16[propFloat16Id + yvTargetId] = yvTarget;
      antsPropsFloat16[propFloat16Id + xvId] = xv;
      antsPropsFloat16[propFloat16Id + yvId] = yv;

      const antSprite = antsSprites.get(id)!;
      antSprite.x = ant.x;
      antSprite.y = ant.y;
      antSprite.rotation = -atan2(xv, yv);

      if (hasFood) {
        const foodChunkSprite = foodBeingCarriedSprites.get(id);
        if (foodChunkSprite) {
          foodChunkSprite.x = ant.x;
          foodChunkSprite.y = ant.y;
          foodChunkSprite.rotation = antSprite.rotation;
        }
      }

      if (ant.x > 0 && ant.y > 0 && ant.x < worldWidth && ant.y < worldHeight)
        antsOnScreenCounter++;
    });

    // if (isDebugDrawOn) {
    // draw.clear();
    // draw.lineStyle(1, 0xff0000);
    // for (const bound of worldBounds) bound.draw(draw);
    // antsCollisionShapes.forEach((ant) => {
    //   ant.draw(draw);
    // });
    // draw.lineStyle(1, 0x00ff00);
    // foodCollisionShapes.forEach((bite) => {
    //   bite.draw(draw);
    // });
    // collisions.draw(draw);
    // }

    if (debugTimer.update(deltaTime)) {
      updateFPSDisplay(deltaTime);
      const { size } = antsCollisionShapes;
      updateAntsCounter(size, size - antsOnScreenCounter);
    }

    lastTime = frameStartTime;
  }

  makeSomeFood(
    ({ id, foodCollisionShape, foodSprite, properties }): void => {
      foodCollisionShapes.set(id, foodCollisionShape);
      collisions.insert(foodCollisionShape);
      foodSprites.set(id, foodSprite);
      app.stage.addChild(foodSprite);
      foodProps.set(id, properties);
    },
    worldWidth * 0.7,
    worldHeight * 0.7,
  );

  releaseTheAnts(
    ({
      id,
      antCollisionShape,
      antSprite,
      rotationChangeTimer,
      propertiesInt8,
      propertiesFloat16,
    }): boolean => {
      antsCollisionShapes.set(id, antCollisionShape);
      collisions.insert(antCollisionShape);
      antsSprites.set(id, antSprite);
      app.stage.addChild(antSprite);
      timers.set(id, rotationChangeTimer);

      propertiesInt8.forEach((prop: number, index: number) => {
        antsPropsInt8[id * antPropsInt8Count + index] = prop;
      });

      propertiesFloat16.forEach((prop: number, index: number) => {
        antsPropsFloat16[id * antPropsFloat16Count + index] = prop;
      });

      return antsCollisionShapes.size < antsCount;
    },
    worldWidth * 0.5,
    worldHeight * 0.5,
    // worldWidth,
    // worldHeight,
    3,
    // antsCount,
  );

  app.ticker.add(simulationUpdate);
};
