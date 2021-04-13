import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant.png';
import { Collisions } from 'collisions/collisions';
import { Shape } from 'collisions/proxyTypes';
import { Result } from 'collisions/result';
import { randomInRange, PI, twoPI, interpolateNumber } from 'utils/math';

type Ant = PIXI.Sprite & {
  body: Shape;
  speed: number;
  targetRotation: number;
};

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
  draw: PIXI.Graphics,
): void => {
  const ants: Ant[] = [];
  // const numberOfAnts = app.renderer instanceof PIXI.Renderer ? 2000 : 100;
  const numberOfAnts = 1;
  const result = new Result();
  const collisions = new Collisions();
  // collisions.createWorldBounds(app.view.width, app.view.height);
  collisions.createWorldBounds(500, 500);
  console.log(container);

  for (let i = 0; i < numberOfAnts; i++) {
    const ant = PIXI.Sprite.from(AntImage) as Ant;
    // const rotation = Math.random() * PI * 2;
    const speed = 150; // randomInRange(100, 100);

    ant.anchor.set(0.5);
    ant.scale.set(1);
    ant.x = 150; // Math.random() * container.offsetWidth;
    ant.y = 150; // Math.random() * container.offsetHeight;
    ant.speed = speed;
    ant.body = collisions.addCircle(ant.x, ant.y, 13 * ant.scale.x) as Shape;
    ant.body.xVelocity = randomInRange(-1, 1);
    ant.body.yVelocity = randomInRange(-1, 1);
    const rotation = -Math.atan2(ant.body.xVelocity, ant.body.yVelocity);
    ant.rotation = rotation;
    ant.targetRotation = rotation;
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
          ant.targetRotation = -Math.atan2(body.xVelocity, body.yVelocity);

          dot = other.xVelocity * result.overlap_y + other.yVelocity * -result.overlap_x;

          other.xVelocity = 2 * dot * result.overlap_y - other.xVelocity;
          other.yVelocity = 2 * dot * -result.overlap_x - other.yVelocity;
        }
      }

      if (ant.targetRotation !== ant.rotation) {
        const diff = ant.targetRotation - ant.rotation;
        const dffAbs = Math.abs(diff);
        if (dffAbs < 0.05) ant.rotation = ant.targetRotation;
        if (dffAbs > PI) {
          ant.rotation += diff * deltaTime * 4;
        } else ant.rotation -= diff * deltaTime * 4;

        if (ant.rotation > PI) {
          ant.rotation = -(twoPI - ant.rotation);
        } else if (ant.rotation < -PI) {
          ant.rotation = twoPI + ant.rotation;
        }
      }

      ant.x = body.x;
      ant.y = body.y;

      draw.clear();
      draw.lineStyle(1, 0xff0000);
      collisions.draw(draw);
    }
  });
};
