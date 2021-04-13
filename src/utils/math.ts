export const { PI } = Math;
export const twoPI = 2 * Math.PI;

export const randomSign = (): number => Math.round(Math.random()) * 2 - 1;

export const randomInRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

// eslint-disable-next-line prettier/prettier
export const clamp = (n: number, min = 0, max = 1): number => (n < min ? min : (n < max ? n : max));

export const interpolateNumber = (
  current: number,
  target: number,
  deltaTime: number,
  interpSpeed = 1,
): number => {
  // Distance to reach
  const dist = target - current;
  // If distance is too small, just set the desired location
  if (dist < 0.001) {
    return target;
  }

  // if (dist > PI) {
  //   return current - dist * clamp(deltaTime * interpSpeed);
  // }

  // Add current to delta move, clamp so we do not over shoot.
  return current + dist * clamp(deltaTime * interpSpeed);
};

// export const interpolateRadians = (
//   current: number,
//   target: number,
//   deltaTime: number,
//   interpSpeed = 1,
// ): number => {
//   const distance = Math.abs(target - current);
//   if (target > current) {
//     return distance < 0.1 ? target : current + distance * deltaTime * interpSpeed;
//   }

//   return target;
// };
