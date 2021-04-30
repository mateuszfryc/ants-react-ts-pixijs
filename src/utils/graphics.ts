import * as PIXI from 'pixi.js';

const app = new PIXI.Application({
  backgroundColor: 0x000000,
});
app.stop();

type PixiSetupResultType = {
  app: PIXI.Application;
  particles: PIXI.ParticleContainer;
  draw: PIXI.Graphics;
};

export const setupGraphics = <T extends HTMLElement>(container: T): PixiSetupResultType => {
  container.append(app.view);

  const particles = new PIXI.ParticleContainer(10000, {
    scale: true,
    position: true,
    rotation: true,
  });
  particles.zIndex = 2;
  app.stage.addChild(particles);
  app.stage.sortableChildren = true;

  const draw = new PIXI.Graphics();
  draw.zIndex = 10;
  app.stage.addChild(draw);

  app.resizeTo = container;

  return { app, particles, draw };
};

export const updateRendererSize = <T extends HTMLElement>(container: T): void => {
  const canavs = document.querySelector('canvas');
  if (canavs) {
    const { offsetWidth, offsetHeight } = container;
    canavs.width = offsetWidth;
    canavs.height = offsetHeight;
  }
};
