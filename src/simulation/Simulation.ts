import { Application, DisplayObject, Graphics } from 'pixi.js';
import { getMetrics } from 'simulation/Metrics';
import { SimulationSettings, Size } from 'simulation/types';
import { TheAntColony } from './AntsColony';
import { Collisions } from './collisions/collisions';
import { makeSomeFood, foodSprites, foodCollisionShapes, foodProps } from './Food';
import { Nest } from './Nest';
import { Pheromones } from './Pheromones';

export class Simulation {
  settings: SimulationSettings;
  graphics: Application;
  pheromones: Pheromones;
  collisions = new Collisions();
  debugDraw: Graphics;
  world: Size;

  constructor(container: HTMLElement, simulationSettings: SimulationSettings) {
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    this.settings = simulationSettings;
    this.graphics = this.setupGraphics(container);
    this.pheromones = new Pheromones(simulationSettings, Math.max(width, height) + 1);
    this.world = { width, height };
    this.debugDraw = this.setupDebugDraw();

    this.run(simulationSettings);
  }

  private setupGraphics(container: HTMLElement): Application {
    const graphics = new Application({
      backgroundColor: 0x000000, // 0xc5bb8e
    });
    graphics.resizeTo = container;
    graphics.stage.sortableChildren = true;
    graphics.stop();
    container.append(graphics.view);

    return graphics;
  }

  private setupDebugDraw(): Graphics {
    const draw = new Graphics();
    draw.zIndex = 10;
    this.graphics.stage.addChild(draw);

    return draw;
  }

  private run(settings: SimulationSettings): void {
    const { nestPositon } = settings;
    const { collisions, world, pheromones, debugDraw } = this;
    const { stage } = this.graphics;

    const nest = new Nest(nestPositon.x, nestPositon.y);
    const AntsColony = new TheAntColony(settings, collisions);
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
      world.width - 150,
      world.height - 150,
    );

    collisions.insert(nest.body, nest.areaIsVisibleIn);
    collisions.createWorldBounds(world.width, world.height, 200, -199);

    this.graphics.stage.addChild(
      AntsColony.antsSprites,
      AntsColony.foodBitesSprites,
      (this.pheromones.sprites as unknown) as DisplayObject,
      nest,
      nest.entranceCoverSprite,
    );

    const [
      metricsTimer,
      updateFPSDisplay,
      updateAntsCounter,
      updatePheromonesCounter,
    ] = getMetrics();

    let lastTime = performance.now();
    // let isTabFocused = true;
    // window.addEventListener('blur', () => {
    //   isTabFocused = false;
    // });
    // window.addEventListener('focus', () => {
    //   lastTime = performance.now();
    //   isTabFocused = true;
    // });

    function simulationUpdate(): void {
      // if (!isTabFocused) return;
      const frameStartTime = performance.now();
      const deltaSeconds = Math.min((frameStartTime - lastTime) / 1000, 0.5);

      const antsOnScreenCount = AntsColony.update(
        deltaSeconds,
        stage,
        pheromones,
        world.width,
        world.height,
      );

      // debugDraw.clear();
      // debugDraw.lineStyle(1, 0xff0000);
      // AntsColony.pheromones.drawShapes(debugDraw);
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

      pheromones.updatePheromones(deltaSeconds);

      if (metricsTimer.update(deltaSeconds)) {
        updateFPSDisplay(deltaSeconds);
        updatePheromonesCounter(pheromones.getPheromonesCount());
        const { size } = AntsColony.antsCollisionShapes;
        updateAntsCounter(size, size - antsOnScreenCount);
      }

      lastTime = frameStartTime;
    }

    this.graphics.ticker.add(simulationUpdate);
    this.graphics.start();
  }

  public prepeareToBeRemoved(): void {
    this.graphics.stage.children.length = 0;
    this.graphics.ticker.stop();
    this.debugDraw.clear();
  }
}
