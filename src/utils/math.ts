export const { PI } = Math;
export const twoPI = 2 * Math.PI;

export const randomSign = (): number => Math.round(Math.random()) * 2 - 1;

export const randomInRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const normalizeRadians = (radians: number): number => {
  if (radians > PI) return -(twoPI - radians);
  if (radians < -PI) return twoPI + radians;

  return radians;
};

export const interpolateRadians = (
  current: number,
  target: number,
  deltaTime: number,
  speed = 4,
): number => {
  const diff = target - current;
  const dffAbs = Math.abs(diff);
  if (dffAbs < 0.05) return target;
  if (dffAbs > PI) return current - diff * deltaTime * speed;

  return current + diff * deltaTime * speed;
};
