import { PixiSetupResultType, setupGraphics } from 'utils/graphics';
import {
  debugTimer,
  setupAntCounter,
  setupFPSDisplay,
  setupPheromonesCounter,
} from 'simulation/debug';
import { SimulationSettings, Size } from 'simulation/types';
import { TheAntColony } from './AntsColony';
import { makeSomeFood, foodSprites, foodCollisionShapes, foodProps } from './Food';
import { createNest } from './Nest';

export class Simulation {
  settings: SimulationSettings;
  graphics: PixiSetupResultType;
  worldBounds: Size;

  constructor(container: HTMLElement, simulationSettings: SimulationSettings) {
    this.settings = simulationSettings;
    this.graphics = setupGraphics(container, simulationSettings.antsCount);
    this.worldBounds = {
      width: container.offsetWidth,
      height: container.offsetHeight,
    };

    this.run(simulationSettings);
  }

  private run({ antsCount, nestPositon, pheromonesLifeSpan }: SimulationSettings): void {
    const { graphicsEngine, stage, antsSprites, foodBitesSprites, _draw } = this.graphics;
    const { width: worldWidth, height: worldHeight } = this.worldBounds;

    const initLabel = 'CreateAntsColony execution time';
    // eslint-disable-next-line no-console
    console.time(initLabel);
    const AntsColony = new TheAntColony(
      antsCount,
      stage,
      antsSprites,
      foodBitesSprites,
      worldWidth,
      worldHeight,
      pheromonesLifeSpan,
    );
    const { collisions, antsCollisionShapes, getPheromonesCount, pheromones } = AntsColony;
    // eslint-disable-next-line no-console
    console.timeEnd(initLabel);
    const nest = createNest(nestPositon.x, nestPositon.y, stage, collisions);

    const { updateFPSDisplay } = setupFPSDisplay();
    const { updateAntsCounter } = setupAntCounter();
    const { updatePheromonesCounter } = setupPheromonesCounter();
    const foodDistanceToNest = 200;
    let lastTime = performance.now();
    AntsColony.releaseOneByOne(nest.x, nest.y);
    // AntsColony.throwAllAtOnce(worldWidth, worldHeight);
    makeSomeFood(
      ({ id, foodCollisionShape, foodSprite, properties }): void => {
        foodCollisionShapes.set(id, foodCollisionShape);
        collisions.insert(foodCollisionShape);
        foodSprites.set(id, foodSprite);
        stage.addChild(foodSprite);
        foodProps.set(id, properties);
      },
      worldWidth - 150,
      worldHeight - 150,
    );

    let isTabFocused = true;
    // window.addEventListener('blur', () => {
    //   isTabFocused = false;
    // });
    // window.addEventListener('focus', () => {
    //   lastTime = performance.now();
    //   isTabFocused = true;
    // });

    function simulationUpdate(): void {
      if (!isTabFocused) return;
      const frameStartTime = performance.now();
      const deltaSeconds = Math.min((frameStartTime - lastTime) / 1000, 0.5);

      const antsOnScreenCount = AntsColony.update(deltaSeconds, stage, worldWidth, worldHeight);

      // _draw.clear();
      // _draw.lineStyle(1, 0xff0000);
      // pheromones.drawShapes(_draw);
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
        updatePheromonesCounter(AntsColony.getPheromonesCount());
        const { size } = antsCollisionShapes;
        updateAntsCounter(size, size - antsOnScreenCount);
      }

      lastTime = frameStartTime;
    }

    graphicsEngine.ticker.add(simulationUpdate);
    graphicsEngine.start();
  }

  public prepeareToBeRemoved(): void {
    const { graphics: g } = this;
    g.stage.children.length = 0;
    g.foodBitesSprites.children.length = 0;
    g.antsSprites.children.length = 0;
    g._draw.clear();
    g.graphicsEngine.ticker.stop();
  }
}
