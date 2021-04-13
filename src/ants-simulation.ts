import * as PIXI from 'pixi.js';

import AntImage from 'assets/ant.png';
import { Collisions, TAGS } from 'collisions/collisions';
import { Shape } from 'collisions/proxyTypes';
import { Result } from 'collisions/result';
import { randomInRange, interpolateRadians, normalizeRadians, PI } from 'utils/math';
import { Mouse } from 'input/mouse';

type Ant = PIXI.Sprite & {
  body: Shape;
  speed: number;
  rotationFlipSign: number;
  rotationFlipTime: number;
  rotationFlipMuliplierCounter: number;
};

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
  draw: PIXI.Graphics,
): void => {
  const ants: Ant[] = [];
  // const numberOfAnts = app.renderer instanceof PIXI.Renderer ? 2000 : 100;
  const numberOfAnts = 1000;
  const result = new Result();
  const collisions = new Collisions();
  const { OBSTACLE } = TAGS;
  collisions.createWorldBounds(app.view.width, app.view.height);

  for (let i = 0; i < numberOfAnts; i++) {
    const ant = PIXI.Sprite.from(AntImage) as Ant;
    const speed = randomInRange(25, 35);

    ant.anchor.set(0.5);
    ant.scale.set(0.2);
    ant.x = container.offsetWidth * 0.5;
    ant.y = container.offsetHeight * 0.5;
    ant.speed = speed;
    ant.body = collisions.addCircle(ant.x, ant.y, 11 * ant.scale.x) as Shape;
    // ant.body.xVelocity = randomInRange(-1, 1);
    // ant.body.yVelocity = randomInRange(-1, 1);
    // const rotation = -Math.atan2(ant.body.xVelocity, ant.body.yVelocity);
    const rotation = -Math.atan2(randomInRange(-1, 1), randomInRange(-1, 1));
    ant.body.rotation = rotation;
    ant.rotation = rotation;
    ant.rotationFlipSign = Math.random() * 2 - 1;
    ant.rotationFlipTime = Math.random() * 2;
    ant.rotationFlipMuliplierCounter = 0;
    ants.push(ant);
    particles.addChild(ant);
  }

  let lastTime = performance.now();

  function simulationUpdate() {
    const frameStartTiem = performance.now();
    const deltaTime = (lastTime - frameStartTiem) / 1000;
    lastTime = frameStartTiem;
    const isMouseDown = Mouse.isPressed;

    collisions.update();
    // eslint-disable-next-line no-restricted-syntax
    for (const ant of ants) {
      const { body, speed } = ant;
      const { rotation } = ant.body;
      body.x += Math.cos(rotation + Math.PI * 0.5) * deltaTime * speed;
      body.y += Math.sin(rotation + Math.PI * 0.5) * deltaTime * speed;

      const potentials = collisions.getPotentials(body as Shape);
      let targetRotation = rotation;

      // eslint-disable-next-line no-restricted-syntax
      for (const other of potentials) {
        if (collisions.isCollision(body as Shape, other, result)) {
          const { overlap, overlap_x, overlap_y } = result;
          body.x -= overlap! * overlap_x;
          body.y -= overlap! * overlap_y;
          targetRotation += normalizeRadians(ant.rotationFlipSign + Math.random() * 1.5);
        }
      }

      // if (isMouseDown) {
      // const { x: mx, y: my } = Mouse;
      // const xDiff = mx - body.x;
      // const yDiff = my - body.y;
      // const bodyToMouseRadians = Math.atan2(xDiff, yDiff);
      // const targetToMouseRotation = bodyToMouseRadians - rotation;
      // }

      targetRotation += normalizeRadians(
        ant.rotationFlipSign > 0
          ? -Math.sin(deltaTime * Math.random())
          : Math.sin(deltaTime * Math.random()),
      );
      ant.rotationFlipMuliplierCounter -= deltaTime;
      if (ant.rotationFlipMuliplierCounter > ant.rotationFlipTime) {
        ant.rotationFlipTime = Math.random() * 4;
        ant.rotationFlipSign *= -1;
        ant.rotationFlipMuliplierCounter = 0;
      }
      if (targetRotation !== rotation) {
        const unsafeRadians = interpolateRadians(rotation, targetRotation, deltaTime, 5);
        body.rotation = normalizeRadians(unsafeRadians);
      }

      ant.x = body.x;
      ant.y = body.y;
      ant.rotation = body.rotation;

      draw.clear();
      draw.lineStyle(1, 0xff0000);
      // collisions.draw(draw);
    }
  }

  app.ticker.add(simulationUpdate);
};
