import * as PIXI from 'pixi.js';

import { ParticleInterface } from 'graphics';
import Ant from 'assets/ant.png';
import { randomSign } from 'utils/math';

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
): void => {
  const ants: ParticleInterface[] = [];
  const numberOfSprites = app.renderer instanceof PIXI.Renderer ? 1000 : 100;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < numberOfSprites; i++) {
    const ant = PIXI.Sprite.from(Ant) as ParticleInterface;
    ant.anchor.set(0.5);
    ant.scale.set(0.3);
    ant.x = Math.random() * container.offsetWidth;
    ant.y = Math.random() * container.offsetHeight;
    ant.direction = Math.random() * Math.PI * 2;
    ant.turningSpeed = Math.random() - 0.8;
    ant.speed = (2 + Math.random() * 2) * 0.5;
    ants.push(ant);
    particles.addChild(ant);
  }

  app.ticker.add((deltaTime) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const ant of ants) {
      ant.direction += ant.turningSpeed * deltaTime * 0.01;
      const { direction, scale, speed } = ant;
      ant.x += Math.sin(direction) * (speed * scale.y) * deltaTime;
      ant.y += Math.cos(direction) * (speed * scale.y) * deltaTime;
      const { x, y } = ant;
      const { offsetWidth, offsetHeight } = container;
      if (x < 0) {
        ant.x = 0;
        ant.direction += randomSign() * direction * deltaTime * 0.1;
      } else if (x > offsetWidth) {
        ant.x = offsetWidth;
        ant.direction += randomSign() * direction * deltaTime * 0.1;
      }
      if (y < 0) {
        ant.y = 0;
        ant.direction += randomSign() * direction * deltaTime * 0.1;
      } else if (y > offsetHeight) {
        ant.y = offsetHeight;
        ant.direction += randomSign() * direction * deltaTime * 0.1;
      }
      ant.rotation = -direction + Math.PI;
    }
  });
};
