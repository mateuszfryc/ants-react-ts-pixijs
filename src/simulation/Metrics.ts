import { makeObservable, observable, action } from 'mobx';

import { Timer } from './Timer';

export class Metrics {
  timer = new Timer(0.5);
  fps = 0;
  fpsMax = 0;
  fpsMin = 999;
  antsCount = 0;
  antsOffScreenCount = 0;
  pheromonesCount = 0;

  constructor() {
    makeObservable(this, {
      fps: observable,
      fpsMax: observable,
      fpsMin: observable,
      antsCount: observable,
      antsOffScreenCount: observable,
      pheromonesCount: observable,
      update: action,
    });
  }

  update(
    deltaTime: number,
    antsCount: number,
    antsOnScreen: number,
    pheromonesCount: number,
  ): void {
    const fps = Math.round(1 / deltaTime);
    if (fps > this.fpsMax) this.fpsMax = fps;
    if (fps < this.fpsMin) this.fpsMin = fps;
    this.fps = fps;

    if (this.antsCount !== antsCount) {
      this.antsCount = antsCount;
    }
    if (this.antsOffScreenCount !== antsOnScreen) {
      this.antsOffScreenCount = antsOnScreen;
    }

    if (this.pheromonesCount !== pheromonesCount) {
      this.pheromonesCount = pheromonesCount;
    }
  }
}
