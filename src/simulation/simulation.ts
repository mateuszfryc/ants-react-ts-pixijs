import * as PIXI from 'pixi.js';

import { Collisions, TAGS } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { Result } from 'simulation/collisions/result';
import { setupAntCounter, setupFPSDisplay } from 'simulation/debug';
import { interpolate, randomInRange } from 'utils/math';
import { Circle } from './collisions/circle';
import { Timer } from './Timer';
import { releaseTheAnts } from './Ant';

const { random, min, atan2 } = Math;

export const setupSimulation = (
  app: PIXI.Application,
  container: HTMLElement,
  draw: PIXI.Graphics,
): void => {
  const result = new Result();
  const collisions = new Collisions();
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;
  const worldBounds = collisions.createWorldBounds(worldWidth, worldHeight, 200, -199);
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  const { ANT } = TAGS;
  let antsOnScreenCounter = 0;

  const ants: Circle[] = [];
  const antsProps: number[][] = [];
  const timers = new Map<number, Timer>();
  const sprites = new Map<number, PIXI.Sprite>();

  let lastTime = performance.now();
  const debugTimer = new Timer(0.5);

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaTime = min((frameStartTime - lastTime) / 1000, 0.5);
    antsOnScreenCounter = 0;

    for (const ant of ants) {
      const { id } = ant;
      const [speed, xv, yv] = antsProps[id];
      ant.x += speed * xv * deltaTime;
      ant.y += speed * yv * deltaTime;
    }

    collisions.update();

    for (const ant of ants) {
      let { id } = ant;
      const props = antsProps[id];
      let [speed, xv, yv, xvTarget, yvTarget, maxSpeed, speedTarget, rotationDirectionSign] = props;
      let performInstanRotation = false;
      let performInstanSpeedChange = false;
      for (const other of collisions.getPotentials(ant as Shape)) {
        if (collisions.isCollision(ant as Shape, other, result)) {
          const { overlap, overlap_x, overlap_y } = result;

          /* eslint-disable indent */
          switch (other.tag) {
            case ANT:
              ant.x -= overlap! * overlap_x;
              ant.y -= overlap! * overlap_y;
              break;

            // default collision response is meant for obstacles, like walls, rocks etc.
            default:
              ant.x -= overlap! * overlap_x;
              ant.y -= overlap! * overlap_y;
              performInstanRotation = true;
              let dot = xvTarget * overlap_y + yvTarget * -overlap_x;
              xvTarget = 2 * dot * overlap_y - xvTarget;
              yvTarget = 2 * dot * -overlap_x - yvTarget;
              performInstanSpeedChange = true;
              speedTarget = maxSpeed * 0.1;
              break;
          }
          /* eslint-enable indent */
        }
      }

      const rotationChangeTImer = timers.get(id);
      if (rotationChangeTImer!.update(deltaTime)) {
        rotationDirectionSign *= -1;
        if (!performInstanRotation) {
          speedTarget = randomInRange(maxSpeed * 0.5, maxSpeed);
          const angle = random() * 5;
          xvTarget += (random() * angle - angle * 0.5) * rotationDirectionSign;
          yvTarget += (random() * angle - angle * 0.5) * rotationDirectionSign;
          // normalize velocity
          const length = Math.sqrt(xvTarget * xvTarget + yvTarget * yvTarget);
          xvTarget /= length;
          yvTarget /= length;
        }
      }

      if (speedTarget !== speed) {
        speed = interpolate(
          speed,
          speedTarget,
          deltaTime,
          performInstanSpeedChange ? maxSpeed * 0.9 : 2,
        );
      } else if (speedTarget !== maxSpeed) {
        speedTarget = maxSpeed;
      }

      // if (performInstanRotation) {
      //   xv = xvTarget;
      //   yv = yvTarget;
      // } else {
      if (xvTarget !== xv) {
        xv = interpolate(xv, xvTarget, deltaTime, (maxSpeed * 0.5) / speed);
      }

      if (yvTarget !== yv) {
        yv = interpolate(yv, yvTarget, deltaTime, (maxSpeed * 0.5) / speed);
      }
      // }

      antsProps[id] = [
        speed,
        xv,
        yv,
        xvTarget,
        yvTarget,
        maxSpeed,
        speedTarget,
        rotationDirectionSign,
      ];

      const antSprite = sprites.get(id)!;
      antSprite.x = ant.x;
      antSprite.y = ant.y;
      antSprite.rotation = -atan2(xv, yv);

      if (ant.x > 0 && ant.y > 0 && ant.x < worldWidth && ant.y < worldHeight)
        antsOnScreenCounter++;
    }

    draw.clear();
    draw.lineStyle(1, 0x00ff00);
    for (const bound of worldBounds) bound.draw(draw);
    // for (const ant of ants) ant.draw(draw);
    // collisions.draw(draw);

    if (debugTimer.update(deltaTime)) {
      updateFPSDisplay(deltaTime);
      updateAntsCounter(ants.length, ants.length - antsOnScreenCounter);
    }

    lastTime = frameStartTime;
  }

  const antsCount = 300;

  releaseTheAnts(
    worldWidth * 0.5,
    worldHeight * 0.5,
    ({ id, antCollisionShape, antSprite, rotationChangeTimer, properties }): boolean => {
      ants.push(antCollisionShape);
      collisions.insert(antCollisionShape);
      sprites.set(id, antSprite);
      app.stage.addChild(antSprite);
      timers.set(id, rotationChangeTimer);
      antsProps[id] = properties;

      return ants.length < antsCount;
    },
  );

  app.ticker.add(simulationUpdate);
};
