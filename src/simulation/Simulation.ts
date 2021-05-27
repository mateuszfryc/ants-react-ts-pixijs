import * as PIXI from 'pixi.js';
import { SimulationSettings, Size } from 'simulation/types';
import { Metrics } from 'simulation/Metrics';
import { Collisions } from './collisions/collisions';
import { TheAntColony } from './AntsColony';
import { Pheromones } from './Pheromones';
import { Food, FoodSource } from './Food';
import { DebugDraw } from './DebugDraw';
import { Shape } from './collisions/proxyTypes';

export class Simulation {
  collisions = new Collisions();
  foodSource = new FoodSource();
  graphics: PIXI.Application;
  settings: SimulationSettings;
  antsColony: TheAntColony;
  pheromones: Pheromones;
  debugDraw: DebugDraw;
  metrics: Metrics;
  world: Size;
  lastTime = 0;

  constructor(
    container: HTMLElement,
    settings: SimulationSettings,
    metrics: Metrics,
    debugDraw: DebugDraw,
  ) {
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    this.world = { width, height };
    this.graphics = this.setupGraphics(container);
    this.antsColony = new TheAntColony(settings, this.collisions);
    this.pheromones = new Pheromones(settings, Math.max(width, height) + 1);
    this.debugDraw = debugDraw;
    this.settings = settings;
    this.metrics = metrics;

    debugDraw.registerDrawable(this.collisions, 'Ants Collisions');
    debugDraw.registerDrawable(this.collisions.bvh, 'Bounding Volume Hierarchy', 0x666666);
    debugDraw.registerDrawable(this.pheromones, 'Pheromones collisions', 0x2299ff);

    this.run();
  }

  private setupGraphics(container: HTMLElement): PIXI.Application {
    const graphics = new PIXI.Application({
      backgroundColor: 0x000000, // 0xc5bb8e
    });
    graphics.resizeTo = container;
    graphics.stage.sortableChildren = true;
    graphics.stop();
    container.append(graphics.view);

    return graphics;
  }

  private run(): void {
    const { collisions, world } = this;
    const { stage } = this.graphics;

    this.antsColony.releaseOneByOne();
    // this.antsColony.throwAllAtOnce(worldWidth, worldHeight);

    this.foodSource.spawnFoodInArea(
      (food: Food): void => {
        const [, shape, sprite] = food;
        collisions.insert(shape as Shape);
        stage.addChild(sprite);
      },
      world.width - 150,
      world.height - 150,
      5,
    );

    collisions.insert(this.antsColony.nest.body, this.antsColony.nest.areaIsVisibleIn);
    collisions.createWorldBounds(world.width, world.height, 200, -199);

    this.graphics.stage.addChild(
      this.antsColony.nest,
      this.antsColony.nest.entranceCoverSprite,
      this.antsColony.antsSprites,
      this.antsColony.foodBitesSprites,
      (this.pheromones.sprites as unknown) as PIXI.DisplayObject,
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
      this.foodSource,
      this.world.width,
      this.world.height,
    );

    this.debugDraw.draw();

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
    this.debugDraw.clearReferences();
    this.graphics.ticker.stop();
    this.graphics.destroy(true, { children: true, texture: false, baseTexture: false });
  }
}
