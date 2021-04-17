export const { PI } = Math;
export const halfPI = PI * 0.5;
export const twoPI = 2 * Math.PI;

export const clamp = (value: number, min = 0, max = 1): number => {
  if (value > max) return max;
  if (value < min) return min;

  return value;
};

export const mapRangeClamped = (
  mappedValue: number,
  inMax: number,
  inMin = 0,
  outMax = 1,
  outMin = 0,
): number => {
  const ratio = mappedValue / Math.abs(inMin - inMax);
  const valueInRange = outMax * ratio;

  return clamp(valueInRange, outMin, outMax);
};

export const randomSign = (): number => Math.round(Math.random()) * 2 - 1;

export const randomInRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const getDistanceFromPointAtoB = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => {
  const xDiff = bx - ax;
  const yDiff = by - ay;

  return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
};

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

export const getMiddleOfTwoRadians = (a: number, b: number): number => {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  const result = max - (max - min) * 0.5;

  return Math.abs(a) + Math.abs(b) > PI ? result - PI : result;
};

export const getRadiansFromPointAtoB = (ax: number, ay: number, bx: number, by: number): number => {
  return -Math.atan2(ax - bx, ay - by);
};
