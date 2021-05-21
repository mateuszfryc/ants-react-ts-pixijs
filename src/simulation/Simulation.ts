import { PixiSetupResultType, setupGraphics } from 'utils/graphics';
import {
  debugTimer,
  setupAntCounter,
  setupFPSDisplay,
  setupPheromonesCounter,
} from 'simulation/debug';
import { CreateAntsColony } from './AntsColony';
import { makeSomeFood, foodSprites, foodCollisionShapes, foodProps } from './Food';
import { Size } from './types';

export class Simulation {
  antsCount: number;
  graphics: PixiSetupResultType;
  worldBounds: Size;

  constructor(container: HTMLElement, antsCount = 100) {
    this.antsCount = antsCount;
    this.graphics = setupGraphics(container, antsCount);
    this.worldBounds = {
      width: container.offsetWidth,
      height: container.offsetHeight,
    };

    this.run();
  }

  private run(): void {
    const { antsCount } = this;
    const { graphicsEngine, stage, antsSprites, foodBitesSprites, _draw } = this.graphics;
    const { width: worldWidth, height: worldHeight } = this.worldBounds;

    const initLabel = 'CreateAntsColony execution time';
    // eslint-disable-next-line no-console
    console.time(initLabel);
    const AntsColony = CreateAntsColony(
      antsCount,
      stage,
      antsSprites,
      foodBitesSprites,
      worldWidth,
      worldHeight,
    );
    const {
      antsCollisions,
      antsCollisionShapes,
      nest,
      getPheromonesCount,
      pheromones,
    } = AntsColony;
    // eslint-disable-next-line no-console
    console.timeEnd(initLabel);

    const { updateFPSDisplay } = setupFPSDisplay();
    const { updateAntsCounter } = setupAntCounter();
    const { updatePheromonesCounter } = setupPheromonesCounter();
    const foodDistanceToNest = 200;
    let lastTime = performance.now();
    AntsColony.releaseOneByOne(nest.x, nest.y);
    // AntsColony.throwAllAtOnce();
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

    let isTabFocused = true;
    window.addEventListener('blur', () => {
      isTabFocused = false;
    });
    window.addEventListener('focus', () => {
      lastTime = performance.now();
      isTabFocused = true;
    });

    function simulationUpdate(): void {
      if (!isTabFocused) return;
      const frameStartTime = performance.now();
      const deltaSeconds = Math.min((frameStartTime - lastTime) / 1000, 0.5);
      let antsOnScreenCounter = 0;

      AntsColony.update(deltaSeconds, frameStartTime);

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
        updatePheromonesCounter(getPheromonesCount());
        const { size } = antsCollisionShapes;
        updateAntsCounter(size, size - antsOnScreenCounter);
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
