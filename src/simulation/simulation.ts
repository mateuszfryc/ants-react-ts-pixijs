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
  twoPI,
} from 'utils/math';
import { Circle } from './collisions/circle';
import { Timer } from './Timer';
import { releaseTheAnts } from './Ant';
import { makeSomeFood } from './Food';

const { random, min, atan2, cos, sin, abs, sign } = Math;

export const setupSimulation = (
  app: PIXI.Application,
  container: HTMLElement,
  draw: PIXI.Graphics,
): void => {
  console.log(container);
  const result = new Result();
  const collisions = new Collisions();
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;
  // const worldWidth = 300;
  // const worldHeight = 300;
  const worldBounds = collisions.createWorldBounds(worldWidth, worldHeight, 200, -199);
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  const { ANT, FOOD } = TAGS;
  let antsOnScreenCounter = 0;

  const ants = new Map<number, Circle>();
  const antsProps = new Map<number, number[]>();
  const food = new Map<number, Circle>();
  const foodProps = new Map<number, number[]>();
  const timers = new Map<number, Timer>();
  const sprites = new Map<number, PIXI.Sprite>();

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

    ants.forEach((ant) => {
      const { id } = ant;
      const [speed, xv, yv] = antsProps.get(id)!;
      ant.x += speed * xv * deltaTime;
      ant.y += speed * yv * deltaTime;
    });

    collisions.update();

    ants.forEach((ant) => {
      let { id } = ant;
      const props = antsProps.get(id)!;
      let [
        speed,
        xv,
        yv,
        xvTarget,
        yvTarget,
        maxSpeed,
        speedTarget,
        rotationDirectionSign,
        hasFood,
      ] = props;
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
          ant.x -= overlap! * overlap_x;
          ant.y -= overlap! * overlap_y;

          /* eslint-disable indent */
          switch (other.tag) {
            case ANT:
              skipRandomDirectionChange = true;
              break;

            default:
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
        // any situation with more than one collision means run the hell out of here
        // or ants will start creating tight groups like hippies in woodstock
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

      antsProps.set(id, [
        speed * mapRange(abs(turnAngle), 0, PI, 1, 0.3),
        xv,
        yv,
        xvTarget,
        yvTarget,
        maxSpeed,
        speedTarget,
        rotationDirectionSign,
      ]);

      const antSprite = sprites.get(id)!;
      antSprite.x = ant.x;
      antSprite.y = ant.y;
      antSprite.rotation = -atan2(xv, yv);

      if (ant.x > 0 && ant.y > 0 && ant.x < worldWidth && ant.y < worldHeight)
        antsOnScreenCounter++;
    });

    draw.clear();
    draw.lineStyle(1, 0xff0000);
    for (const bound of worldBounds) bound.draw(draw);
    ants.forEach((ant) => {
      ant.draw(draw);
    });
    draw.lineStyle(1, 0x00ff00);
    food.forEach((bite) => {
      bite.draw(draw);
    });
    // collisions.draw(draw);

    if (debugTimer.update(deltaTime)) {
      updateFPSDisplay(deltaTime);
      updateAntsCounter(ants.size, ants.size - antsOnScreenCounter);
    }

    lastTime = frameStartTime;
  }

  makeSomeFood(
    ({ id, foodCollisionShape, foodSprite, properties }): void => {
      food.set(id, foodCollisionShape);
      collisions.insert(foodCollisionShape);
      sprites.set(id, foodSprite);
      // app.stage.addChild(foodSprite);
      foodProps.set(id, properties);
    },
    worldWidth * 0.7,
    worldHeight * 0.7,
  );

  const antsCount = 4000;

  releaseTheAnts(
    ({ id, antCollisionShape, antSprite, rotationChangeTimer, properties }): boolean => {
      ants.set(id, antCollisionShape);
      collisions.insert(antCollisionShape);
      sprites.set(id, antSprite);
      // app.stage.addChild(antSprite);
      timers.set(id, rotationChangeTimer);
      antsProps.set(id, properties);

      return ants.size < antsCount;
    },
    worldWidth * 0.4,
    worldHeight * 0.4,
    2,
  );

  app.ticker.add(simulationUpdate);
};
