export const doNTimes = (callback: (index: number) => void, n: number): void => {
  let i = 0;
  for (i; i < n; i++) {
    callback(i);
  }
};
