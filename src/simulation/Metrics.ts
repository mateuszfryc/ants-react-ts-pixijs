import { Timer } from './Timer';

const get = document.querySelector.bind(document);

const metricsTimer = new Timer(0.5);

type FpsUpdate = (deltaTime: number) => void;
const setupFPSDisplay = (): FpsUpdate => {
  let fpsMax = 0;
  let fpsMin = 999;

  const [fpsElement, fpsMaxElement, fpsMinElement] = [
    '#status-fps span',
    '#status-fps-max span',
    '#status-fps-min span',
  ].map((id: string) => get(id));

  return (deltaTime: number): void => {
    const fps = Math.round(1 / deltaTime);
    fpsElement.innerHTML = `${fps}`;
    if (fps > fpsMax) fpsMax = fps;
    fpsMaxElement.innerHTML = `${fpsMax}`;
    if (fps < fpsMin) fpsMin = fps;
    fpsMinElement.innerHTML = `${fpsMin}`;
  };
};

type AntsCoutnUpdate = (t: number, o: number) => void;
const setupAntCounter = (): AntsCoutnUpdate => {
  let antsTotalCount = 0;
  let antsOnScreenCount = 0;

  const [antsTotalElement, antsOnScreenElement] = [
    '#status-ants-total span',
    '#status-ants-on-screen span',
  ].map((id: string) => get(id));

  return (total: number, onScreen: number): void => {
    if (antsTotalCount !== total) {
      antsTotalElement.innerHTML = total;
      antsTotalCount = total;
    }
    if (antsOnScreenCount !== onScreen) {
      antsOnScreenElement.innerHTML = onScreen;
      antsOnScreenCount = onScreen;
    }
  };
};

type PheromonesCountUpdate = (newCount: number) => void;
const setupPheromonesCounter = (): PheromonesCountUpdate => {
  let pheromonesCount = 0;
  const pheromonesCountElement = get('#status-pheromones-total span');

  return (newCount: number): void => {
    if (pheromonesCount !== newCount && pheromonesCountElement) {
      pheromonesCountElement.innerHTML = `${newCount}`;
      pheromonesCount = newCount;
    }
  };
};

export function getMetrics(): [Timer, FpsUpdate, AntsCoutnUpdate, PheromonesCountUpdate] {
  return [metricsTimer, setupFPSDisplay(), setupAntCounter(), setupPheromonesCounter()];
}
