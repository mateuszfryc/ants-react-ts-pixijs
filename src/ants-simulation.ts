import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant.png';
import { Collisions } from 'collisions/collisions';
import { Shape } from 'collisions/proxyTypes';
import { Result } from 'collisions/result';
import { randomInRange, PI, twoPI } from 'utils/math';

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
    const speed = randomInRange(80, 100);

    ant.anchor.set(0.5);
    ant.scale.set(1);
    ant.x = Math.random() * container.offsetWidth;
    ant.y = Math.random() * container.offsetHeight;
    ant.speed = speed;
    ant.body = collisions.addCircle(ant.x, ant.y, 13 * ant.scale.x) as Shape;
    ant.body.xVelocity = randomInRange(-1, 1);
    ant.body.yVelocity = randomInRange(-1, 1);
    const rotation = -Math.atan2(ant.body.xVelocity, ant.body.yVelocity);
    ant.body.rotation = rotation;
    ant.body.targetRotation = rotation;
    ant.rotation = rotation;
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
          body.targetRotation = -Math.atan2(body.xVelocity, body.yVelocity);

          dot = other.xVelocity * result.overlap_y + other.yVelocity * -result.overlap_x;

          other.xVelocity = 2 * dot * result.overlap_y - other.xVelocity;
          other.yVelocity = 2 * dot * -result.overlap_x - other.yVelocity;
          other.targetRotation = -Math.atan2(other.xVelocity, other.yVelocity);
        }
      }

      if (ant.body.targetRotation !== ant.body.rotation) {
        const diff = ant.body.targetRotation - ant.body.rotation;
        const dffAbs = Math.abs(diff);
        if (dffAbs < 0.05) ant.body.rotation = ant.body.targetRotation;
        if (dffAbs > PI) {
          ant.body.rotation += diff * deltaTime * 4;
        } else ant.body.rotation -= diff * deltaTime * 4;

        if (ant.body.rotation > PI) {
          ant.body.rotation = -(twoPI - ant.body.rotation);
        } else if (ant.body.rotation < -PI) {
          ant.body.rotation = twoPI + ant.body.rotation;
        }
      }

      ant.x = body.x;
      ant.y = body.y;
      ant.rotation = ant.body.rotation;

      draw.clear();
      draw.lineStyle(1, 0xff0000);
      collisions.draw(draw);
    }
  });
};
