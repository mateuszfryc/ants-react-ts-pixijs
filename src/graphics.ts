import * as PIXI from 'pixi.js';

const app = new PIXI.Application({
  backgroundColor: 0xffffff,
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
  app.stage.addChild(particles);

  const draw = new PIXI.Graphics();
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

export interface ParticleInterface extends PIXI.Sprite {
  anchor: PIXI.ObservablePoint;
  x: number;
  y: number;
  direction: number;
  tint: number;
  turningSpeed: number;
  scale: PIXI.ObservablePoint;
  speed: number;
  rotation: number;
}
