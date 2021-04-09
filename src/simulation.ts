import * as PIXI from 'pixi.js';

import { antTextures, ParticleInterface } from 'graphics';

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
): void => {
  const ants: ParticleInterface[] = [];
  const numberOfSprites = app.renderer instanceof PIXI.Renderer ? 300 : 100;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < numberOfSprites; i++) {
    const ant = new PIXI.AnimatedSprite(antTextures) as ParticleInterface;
    ant.anchor.set(0.5);
    ant.scale.set(0.3);
    ant.x = Math.random() * container.offsetWidth;
    ant.y = Math.random() * container.offsetHeight;
    ant.direction = Math.random() * Math.PI * 2;
    ant.turningSpeed = Math.random() - 0.8;
    ant.speed = (2 + Math.random() * 2) * 0.2;
    ants.push(ant);
    particles.addChild(ant);
    ant.play();
  }

  app.ticker.add((deltaTime) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const ant of ants) {
      ant.direction += ant.turningSpeed * deltaTime * 0.01;
      ant.x += Math.sin(ant.direction) * (ant.speed * ant.scale.y) * deltaTime;
      ant.y += Math.cos(ant.direction) * (ant.speed * ant.scale.y) * deltaTime;
      ant.rotation = -ant.direction + Math.PI;
    }
  });
};
