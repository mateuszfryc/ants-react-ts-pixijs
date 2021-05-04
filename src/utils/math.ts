export const { PI } = Math;
export const halfPI = PI * 0.5;
export const twoPI = 2 * Math.PI;
const { atan2, min, max, random, abs, round } = Math;

export const clamp = (value: number, minimum = 0, maximum = 1): number => {
  if (value > maximum) return maximum;
  if (value < minimum) return minimum;

  return value;
};

export const mapRange = (
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => {
  return ((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

export const mapRangeClamped = (
  mappedValue: number,
  inMin = 0,
  inMax = 1,
  outMin = 0,
  outMax = 1,
): number => {
  const value = ((mappedValue - inMin) * (outMax - outMin)) / (inMax - inMin);
  if (value > outMax) return outMax;
  if (value < outMin) return outMin;

  return value;
};

export const randomSign = (): number => round(random()) * 2 - 1;

export const randomInRange = (minimum = 0, maximum = 1): number =>
  random() * (maximum - minimum) + minimum;

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

export const interpolate = (
  current: number,
  target: number,
  deltaTime: number,
  speed = 4,
): number => {
  const diff = target - current;
  const dffAbs = abs(diff);
  if (dffAbs < 0.05) return target;

  return current + diff * deltaTime * speed;
};

export const interpolateRadians = (
  current: number,
  target: number,
  deltaTime: number,
  speed = 4,
): number => {
  const diff = target - current;
  const dffAbs = abs(diff);
  if (dffAbs < 0.05) return target;
  if (dffAbs > PI) return current - diff * deltaTime * speed;

  return current + diff * deltaTime * speed;
};

export const getMiddleOfTwoRadians = (a: number, b: number): number => {
  const maximum = max(a, b);
  const minimum = min(a, b);
  const result = maximum - (maximum - minimum) * 0.5;

  return abs(a) + abs(b) > PI ? result - PI : result;
};

export const getRadiansFromPointAtoB = (ax: number, ay: number, bx: number, by: number): number => {
  return -atan2(ax - bx, ay - by);
};

export const doNTimes = (callback: () => void, n: number): void => {
  let i = 0;
  for (i; i < n; i++) {
    callback();
  }
};
