export type Size = { width: number; height: number };

export type Vector = {
  x: number;
  y: number;
};

export type SimulationSettings = {
  antsCount: number;
  nestPositon: Vector;
  pheromonesLifeSpan: number;
};
