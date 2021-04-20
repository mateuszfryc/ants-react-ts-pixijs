import * as PIXI from 'pixi.js';

import { Collisions } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { Result } from 'simulation/collisions/result';
import { setupAntCounter, setupFPSDisplay } from 'simulation/debug';
import { interpolate, randomInRange, randomSign } from 'utils/math';
import { Timer } from '../Timer';
import { Circle } from './circle';

const { random, sin, cos } = Math;

export const setupCollisionsTest = (
  app: PIXI.Application,
  container: HTMLElement,
  draw: PIXI.Graphics,
): void => {
  const result = new Result();
  const collisions = new Collisions();
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;
  const worldBounds = collisions.createWorldBounds(worldWidth, worldHeight, 20, 10);
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  let antsOnScreenCounter = 0;

  const ants: Circle[] = [];
  const antsProps: number[][] = [];
  const timers = new Map<number, Timer>();

  let lastTime = performance.now();
  const debugTimer = new Timer(0.5);

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaTime = (frameStartTime - lastTime) / 1000;
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

          ant.x -= overlap! * overlap_x;
          ant.y -= overlap! * overlap_y;
          performInstanRotation = true;
          let dot = xvTarget * overlap_y + yvTarget * -overlap_x;
          xvTarget = 2 * dot * overlap_y - xvTarget;
          yvTarget = 2 * dot * -overlap_x - yvTarget;
          performInstanSpeedChange = true;
          speedTarget = maxSpeed * 0;
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

      if (performInstanRotation) {
        xv = xvTarget;
        yv = yvTarget;
      } else {
        if (xvTarget !== xv) {
          xv = interpolate(xv, xvTarget, deltaTime, (maxSpeed * 0.5) / speed);
        }

        if (yvTarget !== yv) {
          yv = interpolate(yv, yvTarget, deltaTime, (maxSpeed * 0.5) / speed);
        }
      }

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

      if (ant.x > 0 && ant.y > 0 && ant.x < worldWidth && ant.y < worldHeight)
        antsOnScreenCounter++;
    }

    draw.clear();
    draw.lineStyle(1, 0x00ff00);
    for (const bound of worldBounds) bound.draw(draw);
    for (const ant of ants) ant.draw(draw);
    // collisions.draw(draw);

    if (debugTimer.update(deltaTime)) {
      updateFPSDisplay(deltaTime);
      updateAntsCounter(ants.length, ants.length - antsOnScreenCounter);
    }

    lastTime = frameStartTime;
  }

  const antsCount = 100;
  let antsIdCounter = 0;

  function releaseTheAnts() {
    setTimeout(() => {
      const ant = collisions.addCircle(
        worldWidth * 0.5,
        worldHeight * 0.5,
        2, // radius
        0, // tag
        1, // scale
        0, // padding
        antsIdCounter,
      );
      timers.set(antsIdCounter, new Timer(undefined, undefined, 0.3, 1.5));

      // x and y random and normalized velocity
      let xv = Math.random() * 2 - 1;
      let yv = Math.random() * 2 - 1;
      const lenght = Math.sqrt(xv * xv + yv * yv);
      xv /= lenght;
      yv /= lenght;
      const xvTarget = xv;
      const yvTarget = yv;
      const maxSpeed = randomInRange(60, 70);
      const speed = maxSpeed * 0.5;
      const targetSpeed = maxSpeed;
      const rotationDirection = randomSign();
      antsProps[antsIdCounter] = [
        speed,
        xv,
        yv,
        xvTarget,
        yvTarget,
        maxSpeed,
        targetSpeed,
        rotationDirection,
      ];

      ants.push(ant);
      antsIdCounter++;
      if (ants.length < antsCount) releaseTheAnts();
    }, 100);
  }

  releaseTheAnts();

  app.ticker.add(simulationUpdate);
};
