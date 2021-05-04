export const doNTimes = (callback: () => void, n: number): void => {
  let i = 0;
  for (i; i < n; i++) {
    callback();
  }
};
