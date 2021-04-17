const get = document.querySelector.bind(document);

type FPSSetterType = {
  updateFPSDisplay: (deltaTime: number) => void;
};

export const setupFPSDisplay = (): FPSSetterType => {
  let fps = 0;
  let fpsMax = 0;
  let fpsMin = 999;

  const [fpsElement, fpsMaxElement, fpsMinElement] = [
    '#status-fps span',
    '#status-fps-max span',
    '#status-fps-min span',
  ].map((id: string) => {
    return get(id);
  });

  return {
    updateFPSDisplay: (deltaTime: number): void => {
      fps = Math.round(1 / deltaTime);
      fpsElement.innerHTML = `${fps}`;
      if (fps > fpsMax) fpsMax = fps;
      fpsMaxElement.innerHTML = `${fpsMax}`;
      if (fps < fpsMin) fpsMin = fps;
      fpsMinElement.innerHTML = `${fpsMin}`;
    },
  };
};
