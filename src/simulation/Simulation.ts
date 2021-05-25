import { Application, DisplayObject, Graphics } from 'pixi.js';
import { Metrics } from 'simulation/Metrics';
import { SimulationSettings, Size } from 'simulation/types';
import { TheAntColony } from './AntsColony';
import { Collisions } from './collisions/collisions';
import { DebugDraw } from './DebugDraw';
import { makeSomeFood, foodSprites, foodCollisionShapes, foodProps } from './Food';
import { Nest } from './Nest';
import { Pheromones } from './Pheromones';

export class Simulation {
  collisions = new Collisions();
  settings: SimulationSettings;
  graphics: Application;
  antsColony: TheAntColony;
  pheromones: Pheromones;
  debugDraw: Graphics;
  metrics: Metrics;
  world: Size;
  lastTime = 0;

  constructor(container: HTMLElement, simulationSettings: SimulationSettings, metrics: Metrics) {
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    this.world = { width, height };
    this.settings = simulationSettings;
    this.antsColony = new TheAntColony(simulationSettings, this.collisions);
    this.pheromones = new Pheromones(simulationSettings, Math.max(width, height) + 1);
    this.debugDraw = new DebugDraw();
    this.metrics = metrics;
    const graphics = new Application({
      backgroundColor: 0x000000, // 0xc5bb8e
    });
    graphics.resizeTo = container;
    graphics.stage.sortableChildren = true;
    graphics.stop();
    container.append(graphics.view);
    this.graphics = graphics;
    this.run(simulationSettings);
  }

  private run(settings: SimulationSettings): void {
    const { nestPositon } = settings;
    const { collisions, world } = this;
    const { stage } = this.graphics;
    const nest = new Nest(nestPositon.x, nestPositon.y);

    this.antsColony.releaseOneByOne(nest.x, nest.y);
    // this.antsColony.throwAllAtOnce(worldWidth, worldHeight);

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
      this.antsColony.antsSprites,
      this.antsColony.foodBitesSprites,
      (this.pheromones.sprites as unknown) as DisplayObject,
      nest,
      nest.entranceCoverSprite,
      this.debugDraw,
    );

    // let isTabFocused = true;
    // window.addEventListener('blur', () => {
    //   isTabFocused = false;
    // });
    // window.addEventListener('focus', () => {
    //   lastTime = performance.now();
    //   isTabFocused = true;
    // });

    this.graphics.ticker.add(this.update.bind(this));
    this.graphics.start();
    this.lastTime = performance.now();
  }

  update(): void {
    // if (!isTabFocused) return;
    const frameStartTime = performance.now();
    const deltaSeconds = Math.min((frameStartTime - this.lastTime) / 1000, 0.5);
    const antsOnScreenCount = this.antsColony.update(
      deltaSeconds,
      this.graphics.stage,
      this.pheromones,
      this.world.width,
      this.world.height,
    );

    // debugDraw.clear();
    // debugDraw.lineStyle(1, 0xff0000);
    // pheromones.drawShapes(debugDraw);
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

    this.pheromones.updatePheromones(deltaSeconds);

    if (this.metrics.timer.update(deltaSeconds)) {
      const { size } = this.antsColony.antsCollisionShapes;
      this.metrics.update(
        deltaSeconds,
        size,
        size - antsOnScreenCount,
        this.pheromones.activePheromones.length,
      );
    }
    this.lastTime = frameStartTime;
  }

  public prepeareToBeRemoved(): void {
    this.graphics.ticker.stop();
    this.graphics.destroy(true, { children: true, texture: false, baseTexture: false });
  }
}
