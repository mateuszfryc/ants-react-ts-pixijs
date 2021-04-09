import * as PIXI from 'pixi.js';

import * as AntFrames from 'assets/ant/';

export const setupPixiAnts = <T extends HTMLElement = HTMLDivElement>(root: T): void => {
  const antTextures = Object.values(AntFrames).map((frame) => PIXI.Texture.from(frame));

  // eslint-disable-next-line prettier/prettier
  const app = new PIXI.Application({ backgroundColor: 0xFFFFFF });
  app.stop();
  root.append(app.view);

  const adjustViewSize = () => {
    const { offsetWidth, offsetHeight } = root;
    app.view.width = offsetWidth;
    app.view.height = offsetHeight;
    app.screen.width = offsetWidth;
    app.screen.height = offsetHeight;
  };

  adjustViewSize();

  window.addEventListener('resize', () => {
    adjustViewSize();
  });

  const particles = new PIXI.ParticleContainer(10000, {
    scale: true,
    position: true,
    rotation: true,
  });
  app.stage.addChild(particles);

  interface Particle extends PIXI.AnimatedSprite {
    anchor: PIXI.ObservablePoint;
    x: number;
    y: number;
    direction: number;
    tint: number;
    turningSpeed: number;
    // offset: number;
    scale: PIXI.ObservablePoint;
    speed: number;
    rotation: number;
  }

  const ants: Particle[] = [];
  const numberOfSprites = app.renderer instanceof PIXI.Renderer ? 1000 : 100;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < numberOfSprites; i++) {
    const ant = new PIXI.AnimatedSprite(antTextures) as Particle;
    ant.anchor.set(0.5);
    ant.scale.set(0.5);
    ant.x = Math.random() * root.offsetWidth;
    ant.y = Math.random() * root.offsetHeight;
    ant.direction = Math.random() * Math.PI * 2;
    ant.turningSpeed = Math.random() - 0.8;
    ant.speed = (2 + Math.random() * 2) * 0.2;
    ants.push(ant);
    particles.addChild(ant);
    ant.play();
  }

  app.ticker.add(() => {
    // eslint-disable-next-line no-restricted-syntax
    for (const ant of ants) {
      ant.direction += ant.turningSpeed * 0.01;
      ant.x += Math.sin(ant.direction) * (ant.speed * ant.scale.y);
      ant.y += Math.cos(ant.direction) * (ant.speed * ant.scale.y);
      ant.rotation = -ant.direction + Math.PI;
    }
  });

  app.start();
};
