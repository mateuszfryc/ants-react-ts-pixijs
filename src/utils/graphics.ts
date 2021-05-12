import * as PIXI from 'pixi.js';

const app = new PIXI.Application({
  backgroundColor: 0x000000,
});
app.stop();

type PixiSetupResultType = {
  graphicsEngine: PIXI.Application;
  antsSprites: PIXI.ParticleContainer;
  foodBitesSprites: PIXI.ParticleContainer;
  stage: PIXI.Container;
  _draw: PIXI.Graphics;
};

export const setupGraphics = <T extends HTMLElement>(
  container: T,
  antsCount: number,
): PixiSetupResultType => {
  container.append(app.view);

  const particlesOptions = { scale: true, position: true, rotation: true };
  const antsSprites = new PIXI.ParticleContainer(antsCount, particlesOptions);
  const foodBitesSprites = new PIXI.ParticleContainer(antsCount, particlesOptions);

  antsSprites.zIndex = 3;
  foodBitesSprites.zIndex = 4;

  app.stage.addChild(antsSprites, foodBitesSprites);
  app.stage.sortableChildren = true;

  const _draw = new PIXI.Graphics();
  _draw.zIndex = 10;
  app.stage.addChild(_draw);

  app.resizeTo = container;

  return {
    graphicsEngine: app,
    stage: app.stage,
    antsSprites,
    foodBitesSprites,
    _draw,
  };
};

export const updateRendererSize = <T extends HTMLElement>(container: T): void => {
  const canavs = document.querySelector('canvas');
  if (canavs) {
    const { offsetWidth, offsetHeight } = container;
    canavs.width = offsetWidth;
    canavs.height = offsetHeight;
  }
};
