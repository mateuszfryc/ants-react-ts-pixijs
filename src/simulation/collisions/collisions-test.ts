import * as PIXI from 'pixi.js';

import { Collisions } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { Result } from 'simulation/collisions/result';
import { setupAntCounter, setupFPSDisplay } from 'simulation/debug';
import { randomInRange, randomSign } from 'utils/math';
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

  const antsCount = 2000;
  let antsIdCounter = 0;
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
      const [xv, yv, speed] = antsProps[id];
      ant.x += speed * xv * deltaTime;
      ant.y += speed * yv * deltaTime;
    }

    collisions.update();

    for (const ant of ants) {
      let { id } = ant;
      const props = antsProps[id];
      let [xv, yv, speed, maxSpeed, rotationDirectionSign] = props;
      let performRandomRotation = true;
      for (const other of collisions.getPotentials(ant as Shape)) {
        if (collisions.isCollision(ant as Shape, other, result)) {
          const { overlap, overlap_x, overlap_y } = result;

          ant.x -= overlap! * overlap_x;
          ant.y -= overlap! * overlap_y;
          performRandomRotation = false;
          let dot = xv * overlap_y + yv * -overlap_x;
          xv = 2 * dot * overlap_y - xv;
          yv = 2 * dot * -overlap_x - yv;
        }
      }

      const rotationChangeTImer = timers.get(id);
      if (rotationChangeTImer!.update(deltaTime)) {
        rotationDirectionSign *= -1;
        if (performRandomRotation) {
          // const angle = random();
          // // eslint-disable-next-line prettier/prettier
          // xv += (cos(angle) * ant.x - sin(angle) * ant.y) - ant.x * rotationDirectionSign;
          // // eslint-disable-next-line prettier/prettier
          // yv += (sin(angle) * ant.x + cos(angle) * ant.y) - ant.y * rotationDirectionSign;
          xv += (random() * 0.25 - 0.125) * rotationDirectionSign;
          yv += (random() * 0.25 - 0.125) * rotationDirectionSign;
          // normalize velocity
          const length = Math.sqrt(xv * xv + yv * yv);
          xv /= length;
          yv /= length;
        }
      }

      if (speed < maxSpeed) speed += deltaTime + 4;
      if (speed > maxSpeed) speed = maxSpeed;
      antsProps[id] = [xv, yv, speed, maxSpeed, rotationDirectionSign];

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
      timers.set(antsIdCounter, new Timer(undefined, undefined, 0.2, 1));

      // x and y random and normalized velocity
      let xv = Math.random() * 2 - 1;
      let yv = Math.random() * 2 - 1;
      const lenght = Math.sqrt(xv * xv + yv * yv);
      xv /= lenght;
      yv /= lenght;
      const speed = randomInRange(40, 50);
      const maxSpeed = speed;
      const rotationDirection = randomSign();
      antsProps[antsIdCounter] = [xv, yv, speed, maxSpeed, rotationDirection];

      ants.push(ant);
      antsIdCounter++;
      if (ants.length < antsCount) releaseTheAnts();
    }, 50);
  }

  releaseTheAnts();

  app.ticker.add(simulationUpdate);
};
