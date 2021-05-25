export type Size = { width: number; height: number };

export type Vector = {
  x: number;
  y: number;
};

export type SimulationSettings = {
  antsCount: number;
  antsScale: number;
  nestPositon: Vector;
  pheromonesLifeSpan: number;
  timeBetweenPheromonesEmissions: number;
  isDebugDrawOn: boolean;
};

export class MetricsState {
  fps = 0;
  fpsMin = 0;
  fpsMax = 0;
  pheromonesCount = 0;
  antsCount = 0;
  antsOffScreenCount = 0;

  set(
    fps = 0,
    fpsMin = 0,
    fpsMax = 0,
    pheromonesCount = 0,
    antsCount = 0,
    antsOffScreen = 0,
  ): void {
    this.fps = fps;
    this.fpsMin = fpsMin;
    this.fpsMax = fpsMax;
    this.pheromonesCount = pheromonesCount;
    this.antsCount = antsCount;
    this.antsOffScreenCount = antsOffScreen;
  }
}
