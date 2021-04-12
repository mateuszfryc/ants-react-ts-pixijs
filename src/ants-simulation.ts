import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant.png';
import { Collisions } from 'collisions/collisions';
import { Circle } from 'collisions/circle';
import { Shape } from 'collisions/proxyTypes';
import { Result } from 'collisions/result';
import { randomInRange } from 'utils/math';

type Ant = PIXI.Sprite & {
  body: Circle;
};

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
): void => {
  const ants: Ant[] = [];
  // const numberOfAnts = app.renderer instanceof PIXI.Renderer ? 2000 : 100;
  const numberOfAnts = 100;
  const result = new Result();
  const speed = 40;
  const collisions = new Collisions();
  collisions.createWorldBounds(app.view.width, app.view.height);

  for (let i = 0; i < numberOfAnts; i++) {
    const ant = PIXI.Sprite.from(AntImage) as Ant;
    ant.anchor.set(0.5);
    ant.scale.set(1.2);
    ant.x = Math.random() * container.offsetWidth;
    ant.y = Math.random() * container.offsetHeight;
    ant.body = collisions.addCircle(ant.x, ant.y, 15);
    const direction = (randomInRange(0, 360) * Math.PI) / 180;
    ant.body.direction_x = Math.cos(direction);
    ant.body.direction_y = Math.sin(direction);
    ants.push(ant);
    particles.addChild(ant);
  }

  let lastTime = performance.now();

  app.ticker.add(() => {
    const frameStartTiem = performance.now();
    const deltaTime = (lastTime - frameStartTiem) / 1000;
    lastTime = frameStartTiem;

    collisions.update();
    // eslint-disable-next-line no-restricted-syntax
    for (const ant of ants) {
      const { body } = ant;
      body.x += body.direction_x * speed * deltaTime;
      body.y += body.direction_y * speed * deltaTime;

      const potentials = collisions.getPotentials(body as Shape);

      // eslint-disable-next-line no-restricted-syntax
      for (const other of potentials) {
        if (collisions.isCollision(body as Shape, other, result)) {
          body.x -= result.overlap! * result.overlap_x;
          body.y -= result.overlap! * result.overlap_y;

          let dot = body.direction_x * result.overlap_y + body.direction_y * -result.overlap_x;

          body.direction_x = 2 * dot * result.overlap_y - body.direction_x;
          body.direction_y = 2 * dot * -result.overlap_x - body.direction_y;

          dot = other.direction_x * result.overlap_y + other.direction_y * -result.overlap_x;

          other.direction_x = 2 * dot * result.overlap_y - other.direction_x;
          other.direction_y = 2 * dot * -result.overlap_x - other.direction_y;
        }
      }
      ant.x = body.x;
      ant.y = body.y;
    }
  });
};
