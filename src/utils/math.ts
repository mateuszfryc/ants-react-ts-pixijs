export const { PI } = Math;
export const twoPI = 2 * Math.PI;

export const randomSign = (): number => Math.round(Math.random()) * 2 - 1;

export const randomInRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;
