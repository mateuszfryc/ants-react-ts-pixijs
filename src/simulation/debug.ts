const get = document.querySelector.bind(document);

export const setupFPSDisplay = (): { [key: string]: (deltaTime: number) => void } => {
  let fpsMax = 0;
  let fpsMin = 999;

  const [fpsElement, fpsMaxElement, fpsMinElement] = [
    '#status-fps span',
    '#status-fps-max span',
    '#status-fps-min span',
  ].map((id: string) => get(id));

  return {
    updateFPSDisplay: (deltaTime: number): void => {
      const fps = Math.round(1 / deltaTime);
      fpsElement.innerHTML = `${fps}`;
      if (fps > fpsMax) fpsMax = fps;
      fpsMaxElement.innerHTML = `${fpsMax}`;
      if (fps < fpsMin) fpsMin = fps;
      fpsMinElement.innerHTML = `${fpsMin}`;
    },
  };
};

export const setupAntCounter = (): { [key: string]: (t: number, o: number) => void } => {
  let antsTotalCount = 0;
  let antsOnScreenCount = 0;

  const [antsTotalElement, antsOnScreenElement] = [
    '#status-ants-total span',
    '#status-ants-on-screen span',
  ].map((id: string) => get(id));

  return {
    updateAntsCounter: (total: number, onScreen: number): void => {
      if (antsTotalCount !== total) {
        antsTotalElement.innerHTML = total;
        antsTotalCount = total;
      }
      if (antsOnScreenCount !== onScreen) {
        antsOnScreenElement.innerHTML = onScreen;
        antsOnScreenCount = onScreen;
      }
    },
  };
};
