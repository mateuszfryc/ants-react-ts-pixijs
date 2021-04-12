import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant.png';
import { Collisions } from 'collisions/collisions';
import { Shape } from 'collisions/proxyTypes';
import { Result } from 'collisions/result';
import { randomInRange } from 'utils/math';

type Ant = PIXI.Sprite & {
  body: Shape;
  speed: number;
};

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
  draw: PIXI.Graphics,
): void => {
  const ants: Ant[] = [];
  // const numberOfAnts = app.renderer instanceof PIXI.Renderer ? 2000 : 100;
  const numberOfAnts = 100;
  const result = new Result();
  const collisions = new Collisions();
  collisions.createWorldBounds(app.view.width, app.view.height);

  for (let i = 0; i < numberOfAnts; i++) {
    const ant = PIXI.Sprite.from(AntImage) as Ant;
    // const rotation = Math.random() * Math.PI * 2;
    const rotation = Math.random() * Math.PI;
    const speed = randomInRange(50, 60);

    ant.anchor.set(0.5);
    ant.scale.set(1);
    ant.rotation = rotation;
    ant.x = Math.random() * container.offsetWidth;
    ant.y = Math.random() * container.offsetHeight;
    ant.body = collisions.addCircle(ant.x, ant.y, 13 * ant.scale.x) as Shape;
    ant.body.xVelocity = Math.cos(rotation);
    ant.body.yVelocity = Math.sin(rotation);
    ant.speed = speed;
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
      const { body, speed } = ant;
      const { xVelocity: x, yVelocity: y } = body;
      body.x += x * deltaTime * speed;
      body.y += y * deltaTime * speed;

      const potentials = collisions.getPotentials(body as Shape);

      // eslint-disable-next-line no-restricted-syntax
      for (const other of potentials) {
        if (collisions.isCollision(body as Shape, other, result)) {
          body.x -= result.overlap! * result.overlap_x;
          body.y -= result.overlap! * result.overlap_y;

          let dot = x * result.overlap_y + y * -result.overlap_x;

          body.xVelocity = 2 * dot * result.overlap_y - x;
          body.yVelocity = 2 * dot * -result.overlap_x - y;

          dot = other.xVelocity * result.overlap_y + other.yVelocity * -result.overlap_x;

          other.xVelocity = 2 * dot * result.overlap_y - other.xVelocity;
          other.yVelocity = 2 * dot * -result.overlap_x - other.yVelocity;
        }
      }

      ant.x = body.x;
      ant.y = body.y;
      ant.rotation = -Math.atan2(body.xVelocity, body.yVelocity);

      draw.clear();
      draw.lineStyle(1, 0xff0000);
      collisions.draw(draw);
    }
  });
};
