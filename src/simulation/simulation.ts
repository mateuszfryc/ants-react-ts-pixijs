import { setupGraphics } from 'utils/graphics';
import {
  debugTimer,
  setupAntCounter,
  setupFPSDisplay,
  setupPheromonesCounter,
} from 'simulation/debug';
import { CreateAntsColony } from './AntsColony';
import { makeSomeFood, foodSprites, foodCollisionShapes, foodProps } from './Food';

export function setupSimulation(container: HTMLElement): void {
  const antsCount = 1000;
  const { graphicsEngine, stage, antsSprites, foodBitesSprites, _draw } = setupGraphics(
    container,
    antsCount,
  );

  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;

  const AntsColony = CreateAntsColony(
    antsCount,
    stage,
    antsSprites,
    foodBitesSprites,
    worldWidth,
    worldHeight,
  );
  const { antsCollisions, antsCollisionShapes, nest, getPheromonesCount } = AntsColony;
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  const { updatePheromonesCounter } = setupPheromonesCounter();
  const foodDistanceToNest = 200;
  let lastTime = performance.now();
  // AntsColony.releaseOneByOne(nest.x, nest.y);
  AntsColony.throwAllAtOnce();
  makeSomeFood(
    ({ id, foodCollisionShape, foodSprite, properties }): void => {
      foodCollisionShapes.set(id, foodCollisionShape);
      antsCollisions.insert(foodCollisionShape);
      foodSprites.set(id, foodSprite);
      stage.addChild(foodSprite);
      foodProps.set(id, properties);
    },
    nest.x + foodDistanceToNest,
    nest.y + foodDistanceToNest,
  );

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaSeconds = Math.min((frameStartTime - lastTime) / 1000, 0.5);
    let antsOnScreenCounter = 0;

    AntsColony.update(deltaSeconds, frameStartTime);

    // _draw.clear();
    // _draw.lineStyle(1, 0xff0000);
    // drawSensors(_draw);
    // _draw.lineStyle(1, 0x005500);
    // pheremonesCollisionShapes.forEach((pheromone) => {
    //   pheromone.draw(_draw);
    // });
    // for (const bound of worldBounds) bound.draw(draw);
    // antsCollisionShapes.forEach((ant) => {
    //   ant.draw(_draw);
    // });
    // draw.lineStyle(1, 0x00ff00);
    // foodCollisionShapes.forEach((bite) => {
    //   bite.draw(draw);
    // });
    // drawSensors(_draw);
    // _draw.lineStyle(1, 0x660000);
    // antsCollisions.drawBVH(_draw);
    // _draw.lineStyle(1, 0x888888);
    // antsCollisions.draw(_draw);

    if (debugTimer.update(deltaSeconds)) {
      updateFPSDisplay(deltaSeconds);
      const { size } = antsCollisionShapes;
      updateAntsCounter(size, size - antsOnScreenCounter);
      updatePheromonesCounter(getPheromonesCount());
    }

    lastTime = frameStartTime;
  }

  graphicsEngine.ticker.add(simulationUpdate);
  graphicsEngine.start();
}
