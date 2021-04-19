import * as PIXI from 'pixi.js';

import { Collisions } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { Result } from 'simulation/collisions/result';
import { Timer } from '../Timer';

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
  draw: PIXI.Graphics,
): void => {
  console.log(container, particles);
  const result = new Result();
  const collisions = new Collisions();
  collisions.createWorldBounds(300, 300, 40, 30);

  const ant = collisions.addCircle(160, 170, 8);
  const speed = 13;

  let lastTime = performance.now();
  const debugStepTimer = new Timer(1);

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaTime = (frameStartTime - lastTime) / 1000;

    if (!debugStepTimer.update(deltaTime)) return;

    ant.x += speed * ant.xv;
    ant.y += speed * ant.yv;
    collisions.update();

    const potentials = collisions.getPotentials(ant as Shape);
    for (const other of potentials) {
      if (collisions.isCollision(ant as Shape, other, result)) {
        const { overlap, overlap_x, overlap_y } = result;

        ant.x -= overlap! * overlap_x;
        ant.y -= overlap! * overlap_y;
        let dot = ant.xv * overlap_y + ant.yv * -overlap_x;
        ant.xv = 2 * dot * overlap_y - ant.xv;
        ant.yv = 2 * dot * -overlap_x - ant.yv;
      }
    }

    draw.clear();
    draw.lineStyle(1, 0x00ff00);
    collisions.draw(draw);

    lastTime = frameStartTime;
  }

  app.ticker.add(simulationUpdate);
};
