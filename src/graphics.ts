import * as PIXI from 'pixi.js';

import * as AntFrames from 'assets/ant/';

const app = new PIXI.Application({
  // resolution: devicePixelRatio,
  // eslint-disable-next-line prettier/prettier
  backgroundColor: 0xffffff,
});
app.stop();

type PixiSetupResultType = {
  app: PIXI.Application;
  particles: PIXI.ParticleContainer;
};

export const setupGraphics = <T extends HTMLElement>(container: T): PixiSetupResultType => {
  container.append(app.view);

  const particles = new PIXI.ParticleContainer(10000, {
    scale: true,
    position: true,
    rotation: true,
  });
  app.stage.addChild(particles);

  app.resizeTo = container;

  return { app, particles };
};

export const updateRendererSize = <T extends HTMLElement>(container: T): void => {
  const canavs = document.querySelector('canvas');
  if (canavs) {
    const { offsetWidth, offsetHeight } = container;
    canavs.width = offsetWidth;
    canavs.height = offsetHeight;
  }
};

export interface ParticleInterface extends PIXI.AnimatedSprite {
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

export const antTextures = Object.values(AntFrames).map((frame) => PIXI.Texture.from(frame));
