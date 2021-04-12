export const randomSign = (): number => Math.round(Math.random()) * 2 - 1;
export const randomInRange = (min: number, max: number): number =>
  Math.floor(Math.random() * max) + min;
