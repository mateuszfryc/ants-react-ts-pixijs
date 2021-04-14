import * as PIXI from 'pixi.js';

import { Collisions, TAGS } from 'collisions/collisions';
import { Shape } from 'collisions/proxyTypes';
import { Result } from 'collisions/result';
import { randomInRange, interpolateRadians, normalizeRadians } from 'utils/math';
import { Ant } from 'Ant';
import { Nest } from 'Nest';
import { ScentParticle } from 'ScentParticle';

let xMouse = 0;
let yMouse = 0;
let leftMouseDown = false;
let shouldMousePush = false;

function getmousePosition(event: MouseEvent): void {
  const e = event || window.event;
  let x = e.pageX;
  let y = e.pageY;

  // IE 8
  if (x === undefined || x === null) {
    const { scrollLeft, scrollTop } = document.body;
    const { documentElement } = document;
    x = e.clientX + scrollLeft + documentElement.scrollLeft;
    y = e.clientY + scrollTop + documentElement.scrollTop;
  }

  xMouse = x;
  yMouse = y;
}

document.addEventListener('mousemove', getmousePosition);
document.addEventListener('mousedown', () => {
  leftMouseDown = true;
});
document.addEventListener('mouseup', () => {
  leftMouseDown = false;
});
document.addEventListener('keydown', () => {
  shouldMousePush = !shouldMousePush;
});

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
  draw: PIXI.Graphics,
): void => {
  const ants: Ant[] = [];
  const numberOfAnts = app.renderer instanceof PIXI.Renderer ? 2000 : 100;
  const result = new Result();
  const collisions = new Collisions();
  const { NEST, SCENT_NEST, OBSTACLE } = TAGS;
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;
  collisions.createWorldBounds(app.view.width, app.view.height);

  const scentParticles = new Map<ScentParticle, ScentParticle>();

  const nest = new Nest(200, 200);
  nest.zIndex = 1;
  collisions.insert(nest.body);
  app.stage.addChild(nest);

  for (let i = 0; i < numberOfAnts; i++) {
    const speed = randomInRange(35, 45);
    const ant = new Ant(nest.x, nest.y, speed);

    ants.push(ant);
    collisions.insert(ant.body as Shape);
    particles.addChild(ant);
  }

  let lastTime = performance.now();

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaTime = (frameStartTime - lastTime) / 1000;

    collisions.update();
    // eslint-disable-next-line no-restricted-syntax
    for (const ant of ants) {
      const { body, speed } = ant;
      /*
        Because of imperfections of collision system ant can escape world bounds.
        If that happens - teleport it back to the nest.
      */
      if (ant.x < 0 || ant.x > worldWidth || ant.y < 0 || ant.y > worldHeight) {
        body.x = nest.x;
        body.y = nest.y;
      }
      const { rotation } = ant.body;
      body.x -= Math.cos(rotation + Math.PI * 0.5) * deltaTime * (leftMouseDown ? 150 : speed);
      body.y -= Math.sin(rotation + Math.PI * 0.5) * deltaTime * (leftMouseDown ? 150 : speed);

      const potentials = collisions.getPotentials(body as Shape);
      let targetRotation = rotation;

      // eslint-disable-next-line no-restricted-syntax
      for (const other of potentials) {
        if (
          // other.tags.includes(OBSTACLE) &&
          collisions.isCollision(body as Shape, other, result)
        ) {
          if (other.tags.includes(SCENT_NEST)) {
            //
          } else {
            const { overlap, overlap_x, overlap_y } = result;
            body.x -= overlap! * overlap_x;
            body.y -= overlap! * overlap_y;
            if (!leftMouseDown)
              targetRotation += normalizeRadians(ant.rotationSign + Math.random() * 1.5);

            if (other.tags.includes(NEST)) {
              ant.nestScent = 2;
            }
          }
        }
      }

      if (leftMouseDown) {
        targetRotation = shouldMousePush
          ? normalizeRadians(-Math.atan2(xMouse - body.x, yMouse - body.y))
          : normalizeRadians(-Math.atan2(body.x - xMouse, body.y - yMouse));
      } else {
        targetRotation += normalizeRadians(
          ant.rotationSign > 0
            ? Math.sin(deltaTime * Math.random())
            : -Math.sin(deltaTime * Math.random()),
        );
        ant.rotationFlipMuliplierCounter += deltaTime;
        if (ant.rotationFlipMuliplierCounter > ant.rotationFlipTime) {
          ant.rotationFlipTime = Math.random() * 4;
          ant.rotationSign *= -1;
          ant.rotationFlipMuliplierCounter = 0;
        }
      }

      if (targetRotation !== rotation) {
        body.rotation = normalizeRadians(
          interpolateRadians(rotation, targetRotation, deltaTime, 5),
        );
      }

      ant.x = body.x;
      ant.y = body.y;
      ant.rotation = body.rotation;

      ant.nestScent -= deltaTime * 0.25;
      if (ant.nestScent > 0 && ant.scentEmissionTimer.update(deltaTime)) {
        const scent = new ScentParticle(body.x, body.y);
        collisions.insert(scent.body);
        app.stage.addChild(scent);
        scentParticles.set(scent, scent);
      }

      draw.clear();
      draw.lineStyle(1, 0xff0000);
      // anthill.body.draw(draw);
      // collisions.draw(draw);
    }

    // eslint-disable-next-line unicorn/no-array-for-each
    scentParticles.forEach((particle: ScentParticle): void => {
      // eslint-disable-next-line no-param-reassign
      particle.lifeTime -= deltaTime;
      // eslint-disable-next-line no-param-reassign
      particle.alpha = particle.lifeTime;
      if (particle.lifeTime <= 0) {
        scentParticles.delete(particle);
        collisions.remove(particle.body);
        // eslint-disable-next-line unicorn/prefer-dom-node-remove
        app.stage.removeChild(particle);
      }
    });

    lastTime = frameStartTime;
  }

  app.ticker.add(simulationUpdate);
};
