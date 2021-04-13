import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant.png';
import { Collisions, TAGS } from 'collisions/collisions';
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
  const numberOfAnts = 2000;
  const result = new Result();
  const collisions = new Collisions();
  const { OBSTACLE } = TAGS;
  collisions.createWorldBounds(app.view.width, app.view.height);

  for (let i = 0; i < numberOfAnts; i++) {
    const ant = PIXI.Sprite.from(AntImage) as Ant;
    const speed = randomInRange(50, 55);

    ant.anchor.set(0.5, 0);
    ant.scale.set(0.2);
    ant.x = container.offsetWidth * 0.5;
    ant.y = container.offsetHeight * 0.5;
    ant.speed = speed;
    ant.body = collisions.addCircle(ant.x, ant.y, 11 * ant.scale.x) as Shape;
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
      const {
        body,
        speed,
        scale: { x: sx },
      } = ant;
      let { xVelocity: x, yVelocity: y } = body;
      body.x += x * deltaTime * speed;
      body.y += y * deltaTime * speed;

      const potentials = collisions.getPotentials(body as Shape);

      // eslint-disable-next-line no-restricted-syntax
      for (const other of potentials) {
        if (other.tags.includes(OBSTACLE) && collisions.isCollision(body as Shape, other, result)) {
          const { overlap, overlap_x, overlap_y } = result;
          body.x -= overlap! * overlap_x;
          body.y -= overlap! * overlap_y;
          // const dot = x * overlap_y + y * -overlap_x;

          // get reflected vector
          // x = 2 * dot * overlap_y - x;
          // y = 2 * dot * -overlap_x - y;
          x += Math.random() * 1 - 0.5;
          y += Math.random() * 1 - 0.5;
        }
      }
      // x += (Math.random() * 2 - 1) * deltaTime * sx * (Math.sin(deltaTime) * 1000);
      // y += (Math.random() * 2 - 1) * deltaTime * sx * (Math.sin(deltaTime) * 1000);
      x += Math.random() * 0.2 - 0.1;
      y += Math.random() * 0.2 - 0.1;
      // normalize velocity
      const vectorLength = Math.sqrt(x * x + y * y);
      x /= vectorLength;
      y /= vectorLength;

      body.targetRotation = -Math.atan2(x, y);
      body.xVelocity = x;
      body.yVelocity = y;

      // if rotation doesn't equal target (heading) rotation - inerpolate it
      const { rotation, targetRotation } = body;
      if (targetRotation !== rotation) {
        const diff = targetRotation - rotation;
        const dffAbs = Math.abs(diff);
        if (dffAbs < 0.05) body.rotation = targetRotation;
        if (dffAbs > PI) {
          body.rotation += diff * deltaTime * 4;
        } else body.rotation -= diff * deltaTime * 4;

        if (rotation > PI) {
          body.rotation = -(twoPI - rotation);
        } else if (rotation < -PI) {
          body.rotation = twoPI + rotation;
        }
      }

      ant.x = body.x;
      ant.y = body.y;
      ant.rotation = body.rotation;

      draw.clear();
      draw.lineStyle(1, 0xff0000);
      // collisions.draw(draw);
    }
  });
};
